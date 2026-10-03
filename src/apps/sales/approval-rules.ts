import { prisma } from '@/lib/prisma';

const client = prisma as any;

export interface SalesApprovalTrigger {
  code: string;
  reason: string;
  severity?: 'warning' | 'blocking';
  metadata?: Record<string, unknown>;
}

export interface SalesApprovalDecision {
  requiresApproval: boolean;
  triggers: SalesApprovalTrigger[];
  summary: string | null;
}

type NormalizedLine = {
  lineNo?: number;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  lineSubtotal?: number;
  lineTotal?: number;
};

type Totals = {
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  grandTotal?: number;
};

const DEFAULT_RULES = {
  maxHeaderDiscountPercentWithoutApproval: 10,
  maxLineDiscountPercentWithoutApproval: 20,
  highValueOrderThreshold: 100000,
  veryHighValueOrderThreshold: 500000,
};

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function evaluateSalesOrderApprovalRules(args: {
  tenantId: string;
  customerAccountId?: string | null;
  lines: NormalizedLine[];
  totals: Totals;
  branchId?: string | null;
  existingOrder?: { status?: string | null; approvalStatus?: string | null } | null;
  requestedApprovalBypass?: boolean;
}) : Promise<SalesApprovalDecision> {
  const triggers: SalesApprovalTrigger[] = [];

  const subtotal = Math.max(0, toNum(args.totals.subtotal, 0));
  const discountTotal = Math.max(0, toNum(args.totals.discountTotal, 0));
  const grandTotal = Math.max(0, toNum(args.totals.grandTotal, 0));
  const headerDiscountPercent = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;

  if (headerDiscountPercent > DEFAULT_RULES.maxHeaderDiscountPercentWithoutApproval) {
    triggers.push({
      code: 'DISCOUNT_HEADER_THRESHOLD',
      reason: `Header discount ${headerDiscountPercent.toFixed(1)}% exceeds ${DEFAULT_RULES.maxHeaderDiscountPercentWithoutApproval}%`,
      metadata: { headerDiscountPercent, threshold: DEFAULT_RULES.maxHeaderDiscountPercentWithoutApproval },
    });
  }

  const maxLineDiscount = args.lines.reduce(
    (max, line) => Math.max(max, toNum((line as any).discountPercent, 0)),
    0
  );
  if (maxLineDiscount > DEFAULT_RULES.maxLineDiscountPercentWithoutApproval) {
    triggers.push({
      code: 'DISCOUNT_LINE_THRESHOLD',
      reason: `Line discount ${maxLineDiscount.toFixed(1)}% exceeds ${DEFAULT_RULES.maxLineDiscountPercentWithoutApproval}%`,
      metadata: { maxLineDiscountPercent: maxLineDiscount, threshold: DEFAULT_RULES.maxLineDiscountPercentWithoutApproval },
    });
  }

  if (grandTotal >= DEFAULT_RULES.highValueOrderThreshold) {
    triggers.push({
      code: 'HIGH_VALUE_ORDER',
      reason:
        grandTotal >= DEFAULT_RULES.veryHighValueOrderThreshold
          ? `Very high-value order (${grandTotal.toFixed(2)}) requires approval`
          : `High-value order (${grandTotal.toFixed(2)}) exceeds threshold`,
      metadata: { grandTotal, threshold: DEFAULT_RULES.highValueOrderThreshold },
    });
  }

  if (args.customerAccountId) {
    const account = await client.customerAccount.findFirst({
      where: { id: args.customerAccountId, tenantId: args.tenantId },
      select: {
        id: true,
        creditHold: true,
        creditLimit: true,
        riskLevel: true,
        status: true,
      },
    });

    if (account) {
      if (account.status && String(account.status).toUpperCase() !== 'ACTIVE') {
        triggers.push({
          code: 'CUSTOMER_ACCOUNT_INACTIVE',
          reason: `Customer account status is ${account.status}`,
          severity: 'blocking',
          metadata: { customerAccountId: account.id, status: account.status },
        });
      }

      if (account.creditHold) {
        triggers.push({
          code: 'CREDIT_HOLD',
          reason: 'Customer account is on credit hold',
          severity: 'blocking',
          metadata: { customerAccountId: account.id },
        });
      }

      const creditLimit = toNum(account.creditLimit, 0);
      if (creditLimit > 0 && grandTotal > creditLimit) {
        triggers.push({
          code: 'CREDIT_LIMIT_EXCEEDED',
          reason: `Order total exceeds customer credit limit (${creditLimit.toFixed(2)})`,
          severity: 'blocking',
          metadata: { customerAccountId: account.id, creditLimit, grandTotal },
        });
      }

      const risk = String(account.riskLevel || '').toUpperCase();
      if (['HIGH', 'CRITICAL'].includes(risk)) {
        triggers.push({
          code: 'CUSTOMER_RISK_REVIEW',
          reason: `Customer risk level ${risk} requires manual review`,
          metadata: { customerAccountId: account.id, riskLevel: risk },
        });
      }
    }
  }

  if (args.requestedApprovalBypass && triggers.length > 0) {
    triggers.push({
      code: 'MANUAL_BYPASS_REQUEST',
      reason: 'Manual approval bypass requested while approval triggers exist',
      metadata: { bypassRequested: true },
    });
  }

  return {
    requiresApproval: triggers.length > 0,
    triggers,
    summary: triggers.length ? triggers.map((t) => t.reason).join('; ') : null,
  };
}

