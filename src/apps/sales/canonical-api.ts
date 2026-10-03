import { prisma } from '@/lib/prisma';
import { evaluateSalesOrderApprovalRules } from './approval-rules';
import { resolveApplicablePrice, resolveTaxProfile } from './commercial-engine';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';
import { recordOperationalEvent } from '@/lib/intelligence/events/operational-event-service';

const client = prisma as any;

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function resolveAndNormalizeLines(
  tenantId: string,
  branchId: string | null,
  customerAccountId: string | null,
  currency: string,
  rawLines: any[]
) {
  const taxProfile = await resolveTaxProfile({ tenantId, branchId });

  return Promise.all(
    rawLines.map(async (line, idx) => {
      const quantity = toNum(line.quantity ?? line.quantityOrdered, 0);
      let unitPrice = toNum(line.unitPrice, 0);
      let discountPercent = toNum(line.discountPercent ?? line.discount, 0);
      let taxPercent = toNum(line.taxPercent ?? line.tax, 0);

      if (line.productId && (line.unitPrice == null || line.recalculatePrice)) {
        const pricing = await resolveApplicablePrice({
          tenantId,
          productId: line.productId,
          branchId,
          customerAccountId,
          currency,
          fallbackPrice: unitPrice,
        });
        unitPrice = pricing.unitPrice;
        if (line.discountPercent == null) {
          discountPercent = pricing.discountPercent;
        }
      }

      if (line.taxPercent == null || line.recalculateTax) {
        taxPercent = taxProfile.taxPercent;
      }

      const lineSubtotal = quantity * unitPrice;
      const discountAmount = lineSubtotal * (discountPercent / 100);
      const taxable = lineSubtotal - discountAmount;
      const taxAmount = taxable * (taxPercent / 100);
      const lineTotal = taxable + taxAmount;

      return {
        lineNo: idx + 1,
        productId: line.productId ?? null,
        description: line.description ?? line.productName ?? 'Item',
        quantity,
        quantityOrdered: quantity,
        unitPrice,
        discountPercent,
        discountAmount,
        taxPercent,
        taxAmount,
        lineSubtotal,
        lineTotal,
        metadata: line.metadata ?? null,
      };
    })
  );
}

function summarize(lines: any[]) {
  const subtotal = lines.reduce((sum, l) => sum + l.lineSubtotal, 0);
  const discountTotal = lines.reduce((sum, l) => sum + l.discountAmount, 0);
  const taxTotal = lines.reduce((sum, l) => sum + l.taxAmount, 0);
  const grandTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return { subtotal, discountTotal, taxTotal, grandTotal };
}

export async function listSalesQuotes(tenantId: string, filters?: any) {
  const where: any = { tenantId };
  if (filters?.status) where.status = filters.status;
  if (filters?.customerAccountId) where.customerAccountId = filters.customerAccountId;
  const quotes = await client.salesQuote.findMany({
    where,
    include: { lines: true, revisions: true },
    orderBy: { createdAt: 'desc' },
  });

  // Enrich with customer data - customerAccountId references Customer directly
  const customerIds = [...new Set(quotes.map((q: any) => q.customerAccountId).filter(Boolean))];
  const customers = customerIds.length > 0
    ? await client.customer.findMany({ where: { id: { in: customerIds } } })
    : [];
  const customerMap = new Map(customers.map((c: any) => [c.id, c]));

  return quotes.map((q: any) => {
    const customer = q.customerAccountId ? customerMap.get(q.customerAccountId) ?? null : null;
    return {
      ...q,
      customer,
      customerName: (customer as any)?.name ?? null,
      customerId: q.customerAccountId,
    };
  });
}

export async function getSalesQuoteById(tenantId: string, id: string) {
  return client.salesQuote.findFirst({
    where: { id, tenantId },
    include: { lines: true, revisions: true },
  });
}

export async function createSalesQuote(tenantId: string, userId: string | undefined, data: any) {
  const lines = await resolveAndNormalizeLines(
    tenantId,
    data.branchId ?? null,
    data.customerAccountId ?? null,
    data.currency ?? 'USD',
    Array.isArray(data.lines) ? data.lines : []
  );
  const totals = summarize(lines);

  const quote = await client.salesQuote.create({
    data: {
      tenantId,
      branchId: data.branchId ?? null,
      customerAccountId: data.customerAccountId ?? null,
      opportunityId: data.opportunityId ?? null,
      quoteNumber: data.quoteNumber ?? `SQ-${Date.now()}`,
      status: data.status ?? 'DRAFT',
      approvalStatus: data.approvalStatus ?? 'NOT_REQUIRED',
      currency: data.currency ?? 'USD',
      exchangeRate: data.exchangeRate != null ? toNum(data.exchangeRate) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      paymentTermsDays: data.paymentTermsDays != null ? Number(data.paymentTermsDays) : null,
      incoterms: data.incoterms ?? null,
      deliveryTerms: data.deliveryTerms ?? null,
      notes: data.notes ?? null,
      termsAndConditions: data.termsAndConditions ?? null,
      ...totals,
      revisionNo: 1,
      metadata: data.metadata ?? null,
      createdByUserId: userId ?? null,
      lines: {
        create: lines.map((line: any) => ({
          tenantId,
          lineNo: line.lineNo,
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          discountAmount: line.discountAmount,
          taxPercent: line.taxPercent,
          taxAmount: line.taxAmount,
          lineSubtotal: line.lineSubtotal,
          lineTotal: line.lineTotal,
          branchId: data.branchId ?? null,
          metadata: line.metadata,
        })),
      },
      revisions: {
        create: {
          tenantId,
          revisionNo: 1,
          snapshot: {
            header: data,
            lines,
            totals,
          },
          createdByUserId: userId ?? null,
        },
      },
    },
    include: { lines: true, revisions: true },
  });

  return quote;
}

export async function updateSalesQuote(tenantId: string, id: string, userId: string | undefined, data: any) {
  const existing = await getSalesQuoteById(tenantId, id);
  if (!existing) throw new Error('Quote not found');

  let lineOps: any = undefined;
  let totals: any = {};
  let revisionIncrement = 0;

  if (Array.isArray(data.lines)) {
    const lines = await resolveAndNormalizeLines(
      tenantId,
      data.branchId ?? existing.branchId ?? null,
      data.customerAccountId ?? existing.customerAccountId ?? null,
      data.currency ?? existing.currency ?? 'USD',
      data.lines
    );
    totals = summarize(lines);
    revisionIncrement = 1;
    await client.salesQuoteLine.deleteMany({ where: { quoteId: id, tenantId } });
    lineOps = {
      create: lines.map((line: any) => ({
        tenantId,
        lineNo: line.lineNo,
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
        discountAmount: line.discountAmount,
        taxPercent: line.taxPercent,
        taxAmount: line.taxAmount,
        lineSubtotal: line.lineSubtotal,
        lineTotal: line.lineTotal,
        branchId: data.branchId ?? existing.branchId ?? null,
        metadata: line.metadata,
      })),
    };
    data._normalizedLinesForSnapshot = lines;
  }

  const updated = await client.salesQuote.update({
    where: { id },
    data: {
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.customerAccountId !== undefined && { customerAccountId: data.customerAccountId }),
      ...(data.opportunityId !== undefined && { opportunityId: data.opportunityId }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.approvalStatus !== undefined && { approvalStatus: data.approvalStatus }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.exchangeRate !== undefined && { exchangeRate: data.exchangeRate == null ? null : toNum(data.exchangeRate) }),
      ...(data.validUntil !== undefined && { validUntil: data.validUntil ? new Date(data.validUntil) : null }),
      ...(data.paymentTermsDays !== undefined && { paymentTermsDays: data.paymentTermsDays == null ? null : Number(data.paymentTermsDays) }),
      ...(data.incoterms !== undefined && { incoterms: data.incoterms }),
      ...(data.deliveryTerms !== undefined && { deliveryTerms: data.deliveryTerms }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.termsAndConditions !== undefined && { termsAndConditions: data.termsAndConditions }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
      ...(revisionIncrement > 0 && totals),
      ...(revisionIncrement > 0 && { revisionNo: existing.revisionNo + 1 }),
      ...(lineOps ? { lines: lineOps } : {}),
      ...(revisionIncrement > 0
        ? {
          revisions: {
            create: {
              tenantId,
              revisionNo: existing.revisionNo + 1,
              snapshot: { header: data, lines: data._normalizedLinesForSnapshot, totals },
              createdByUserId: userId ?? null,
            },
          },
        }
        : {}),
    },
    include: { lines: true, revisions: true },
  });

  return updated;
}

export async function deleteSalesQuote(tenantId: string, id: string) {
  await client.salesQuote.deleteMany({ where: { id, tenantId } });
  return { success: true };
}

export async function convertSalesQuoteToOrderV2(
  tenantId: string,
  quoteId: string,
  userId: string | undefined,
  data?: any
) {
  const quote = await getSalesQuoteById(tenantId, quoteId);
  if (!quote) throw new Error('Quote not found');

  if (quote.status === 'CONVERTED' && !data?.allowDuplicateConversion) {
    throw new Error('Quote is already converted');
  }

  const rawLines = Array.isArray(quote.lines)
    ? quote.lines.map((line: any) => ({
      productId: line.productId ?? null,
      description: line.description ?? 'Item',
      quantity: line.quantity ?? 0,
      unitPrice: line.unitPrice ?? 0,
      discountPercent: line.discountPercent ?? 0,
      taxPercent: line.taxPercent ?? 0,
      metadata: line.metadata ?? null,
    }))
    : [];

  const orderPayload = {
    branchId: data?.branchId ?? quote.branchId ?? null,
    customerAccountId: data?.customerAccountId ?? quote.customerAccountId ?? null,
    opportunityId: data?.opportunityId ?? quote.opportunityId ?? null,
    sourceQuoteId: quote.id,
    orderNumber: data?.orderNumber ?? undefined,
    status: data?.status ?? 'DRAFT',
    approvalStatus: data?.approvalStatus ?? 'NOT_REQUIRED',
    fulfillmentStatus: data?.fulfillmentStatus ?? 'NOT_STARTED',
    invoiceStatus: data?.invoiceStatus ?? 'NOT_INVOICED',
    currency: data?.currency ?? quote.currency ?? 'USD',
    exchangeRate: data?.exchangeRate ?? quote.exchangeRate ?? null,
    orderDate: data?.orderDate ?? new Date().toISOString(),
    expectedDeliveryDate: data?.expectedDeliveryDate ?? null,
    incoterms: data?.incoterms ?? quote.incoterms ?? null,
    deliveryTerms: data?.deliveryTerms ?? quote.deliveryTerms ?? null,
    paymentTermsDays: data?.paymentTermsDays ?? quote.paymentTermsDays ?? null,
    notes: data?.notes ?? quote.notes ?? null,
    metadata: {
      ...(quote.metadata || {}),
      ...(data?.metadata || {}),
      source: 'QUOTE_CONVERSION',
      sourceQuoteId: quote.id,
      sourceQuoteNumber: quote.quoteNumber,
      sourceQuoteRevisionNo: quote.revisionNo ?? null,
    },
    lines: rawLines,
  };

  const order = await createSalesOrderV2(tenantId, userId, orderPayload);

  const updatedQuote = await client.salesQuote.update({
    where: { id: quote.id },
    data: {
      status: data?.markQuoteStatus ?? 'CONVERTED',
      metadata: {
        ...(quote.metadata || {}),
        lastConvertedOrderId: order.id,
        lastConvertedOrderNumber: order.orderNumber,
        lastConvertedAt: new Date().toISOString(),
      },
    },
  });

  try {
    await client.salesAuditEvent.create({
      data: {
        tenantId,
        branchId: order.branchId ?? quote.branchId ?? null,
        entityType: 'QUOTE',
        entityId: quote.id,
        action: 'CONVERT_TO_ORDER',
        actorUserId: userId ?? null,
        summary: `Quote ${quote.quoteNumber} converted to order ${order.orderNumber}`,
        beforeSnapshot: quote,
        afterSnapshot: updatedQuote,
        metadata: { salesOrderId: order.id, salesOrderNumber: order.orderNumber },
      },
    });
  } catch (error) {
    console.error('Failed to write quote conversion audit event:', error);
  }

  return { quote: updatedQuote, order };
}

export async function listSalesOrdersV2(tenantId: string, filters?: any) {
  const where: any = { tenantId };
  if (filters?.status) where.status = filters.status;
  if (filters?.customerAccountId) where.customerAccountId = filters.customerAccountId;
  if (filters?.approvalStatus) where.approvalStatus = filters.approvalStatus;
  return client.salesOrderV2.findMany({
    where,
    include: { lines: true, approvals: true, fulfillmentRequests: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSalesOrderV2ById(tenantId: string, id: string) {
  return client.salesOrderV2.findFirst({
    where: { id, tenantId },
    include: { lines: true, approvals: true, fulfillmentRequests: true },
  });
}

export async function createSalesOrderV2(tenantId: string, userId: string | undefined, data: any) {
  const lines = await resolveAndNormalizeLines(
    tenantId,
    data.branchId ?? null,
    data.customerAccountId ?? null,
    data.currency ?? 'USD',
    Array.isArray(data.lines) ? data.lines : []
  );
  const totals = summarize(lines);
  const approvalDecision = await evaluateSalesOrderApprovalRules({
    tenantId,
    customerAccountId: data.customerAccountId ?? null,
    branchId: data.branchId ?? null,
    lines,
    totals,
    requestedApprovalBypass: !!data.requestApprovalBypass,
  });
  const approvalRequired = approvalDecision.requiresApproval;
  const resolvedApprovalStatus = approvalRequired ? 'PENDING' : (data.approvalStatus ?? 'NOT_REQUIRED');
  const resolvedStatus =
    approvalRequired && !['CANCELLED', 'CLOSED'].includes(String(data.status || '').toUpperCase())
      ? 'PENDING_APPROVAL'
      : (data.status ?? 'DRAFT');
  const approvalReason = data.approvalReason ?? approvalDecision.summary ?? null;
  const approvalRows = approvalRequired
    ? approvalDecision.triggers.map((trigger) => ({
      tenantId,
      status: 'PENDING',
      ruleCode: trigger.code,
      reason: trigger.reason,
      requestedByUserId: userId ?? null,
      metadata: trigger.metadata ?? null,
    }))
    : data.approvalStatus === 'PENDING'
      ? [
        {
          tenantId,
          status: 'PENDING',
          ruleCode: data.ruleCode ?? 'MANUAL',
          reason: data.approvalReason ?? 'Approval requested',
          requestedByUserId: userId ?? null,
          metadata: data.metadata?.approvalRequestMeta ?? null,
        },
      ]
      : [];

  const order = await client.salesOrderV2.create({
    data: {
      tenantId,
      branchId: data.branchId ?? null,
      customerAccountId: data.customerAccountId ?? null,
      opportunityId: data.opportunityId ?? null,
      sourceQuoteId: data.sourceQuoteId ?? null,
      orderNumber: data.orderNumber ?? `SO2-${Date.now()}`,
      status: resolvedStatus,
      approvalStatus: resolvedApprovalStatus,
      fulfillmentStatus: data.fulfillmentStatus ?? 'NOT_STARTED',
      invoiceStatus: data.invoiceStatus ?? 'NOT_INVOICED',
      currency: data.currency ?? 'USD',
      exchangeRate: data.exchangeRate != null ? toNum(data.exchangeRate) : null,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      incoterms: data.incoterms ?? null,
      deliveryTerms: data.deliveryTerms ?? null,
      paymentTermsDays: data.paymentTermsDays != null ? Number(data.paymentTermsDays) : null,
      notes: data.notes ?? null,
      ...totals,
      approvalReason,
      metadata: {
        ...(data.metadata || {}),
        approvalEvaluation: approvalRequired
          ? {
            evaluatedAt: new Date().toISOString(),
            triggers: approvalDecision.triggers,
          }
          : undefined,
      },
      createdByUserId: userId ?? null,
      lines: {
        create: lines.map((line: any) => ({
          tenantId,
          lineNo: line.lineNo,
          productId: line.productId,
          description: line.description,
          quantityOrdered: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          discountAmount: line.discountAmount,
          taxPercent: line.taxPercent,
          taxAmount: line.taxAmount,
          lineSubtotal: line.lineSubtotal,
          lineTotal: line.lineTotal,
          metadata: line.metadata,
        })),
      },
      approvals: approvalRows.length
        ? {
          create: approvalRows,
        }
        : undefined,
    },
    include: { lines: true, approvals: true, fulfillmentRequests: true },
  });

  await recordOperationalEvent(prisma, {
    tenantId,
    moduleKey: 'sales',
    entityType: 'SALES_ORDER_V2',
    entityId: order.id,
    action: 'SALES_ORDER_CREATED',
    actorUserId: userId ?? null,
    occurredAt: order.createdAt,
    metadata: {
      orderNumber: order.orderNumber,
      approvalStatus: order.approvalStatus,
      grandTotal: order.grandTotal,
      lineCount: order.lines.length,
    },
  });

  if (approvalRows.length > 0) {
    await recordOperationalEvent(prisma, {
      tenantId,
      moduleKey: 'sales',
      entityType: 'SALES_ORDER_V2',
      entityId: order.id,
      action: 'APPROVAL_REQUESTED',
      actorUserId: userId ?? null,
      occurredAt: order.createdAt,
      metadata: {
        orderNumber: order.orderNumber,
        approvalStatus: order.approvalStatus,
        triggerCount: approvalRows.length,
        triggers: approvalRows.map((trigger) => ({
          ruleCode: trigger.ruleCode,
          reason: trigger.reason,
        })),
      },
    });
  }

  return order;
}

export async function updateSalesOrderV2(
  tenantId: string,
  id: string,
  data: any,
  userId?: string | null
) {
  const existing = await getSalesOrderV2ById(tenantId, id);
  if (!existing) throw new Error('Sales order not found');

  let totals: any = {};
  if (Array.isArray(data.lines)) {
    const lines = await resolveAndNormalizeLines(
      tenantId,
      data.branchId ?? existing.branchId ?? null,
      data.customerAccountId ?? existing.customerAccountId ?? null,
      data.currency ?? existing.currency ?? 'USD',
      data.lines
    );
    totals = summarize(lines);
    await client.salesOrderLine.deleteMany({ where: { salesOrderId: id, tenantId } });
    data._normalizedLines = lines;
  }

  const commercialFieldsTouched =
    data.customerAccountId !== undefined ||
    data.branchId !== undefined ||
    data.lines !== undefined ||
    data.currency !== undefined ||
    data.exchangeRate !== undefined ||
    data.paymentTermsDays !== undefined;

  let approvalDecision: Awaited<ReturnType<typeof evaluateSalesOrderApprovalRules>> | null = null;
  let approvalPatch: any = {};
  if (commercialFieldsTouched || data.recalculateApproval === true) {
    const evaluationLines = Array.isArray(data._normalizedLines) ? data._normalizedLines : (existing.lines || []);
    const evaluationTotals = Array.isArray(data._normalizedLines)
      ? totals
      : {
        subtotal: existing.subtotal,
        discountTotal: existing.discountTotal,
        taxTotal: existing.taxTotal,
        grandTotal: existing.grandTotal,
      };

    approvalDecision = await evaluateSalesOrderApprovalRules({
      tenantId,
      customerAccountId: data.customerAccountId !== undefined ? data.customerAccountId : existing.customerAccountId,
      branchId: data.branchId !== undefined ? data.branchId : existing.branchId,
      lines: evaluationLines,
      totals: evaluationTotals,
      existingOrder: existing,
      requestedApprovalBypass: !!data.requestApprovalBypass,
    });

    if (approvalDecision.requiresApproval) {
      approvalPatch = {
        approvalStatus: 'PENDING',
        approvalReason: approvalDecision.summary,
        ...(!['CANCELLED', 'DELIVERED', 'CLOSED'].includes(String(data.status ?? existing.status ?? '').toUpperCase())
          ? { status: 'PENDING_APPROVAL' }
          : {}),
        metadata: {
          ...(existing.metadata || {}),
          ...(data.metadata || {}),
          approvalEvaluation: {
            evaluatedAt: new Date().toISOString(),
            triggers: approvalDecision.triggers,
          },
        },
      };
    }
  }

  const updated = await client.salesOrderV2.update({
    where: { id },
    data: {
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.customerAccountId !== undefined && { customerAccountId: data.customerAccountId }),
      ...(data.opportunityId !== undefined && { opportunityId: data.opportunityId }),
      ...(data.sourceQuoteId !== undefined && { sourceQuoteId: data.sourceQuoteId }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.approvalStatus !== undefined && { approvalStatus: data.approvalStatus }),
      ...(data.fulfillmentStatus !== undefined && { fulfillmentStatus: data.fulfillmentStatus }),
      ...(data.invoiceStatus !== undefined && { invoiceStatus: data.invoiceStatus }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.exchangeRate !== undefined && {
        exchangeRate: data.exchangeRate == null ? null : toNum(data.exchangeRate),
      }),
      ...(data.orderDate !== undefined && { orderDate: data.orderDate ? new Date(data.orderDate) : undefined }),
      ...(data.expectedDeliveryDate !== undefined && {
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      }),
      ...(data.incoterms !== undefined && { incoterms: data.incoterms }),
      ...(data.deliveryTerms !== undefined && { deliveryTerms: data.deliveryTerms }),
      ...(data.paymentTermsDays !== undefined && {
        paymentTermsDays: data.paymentTermsDays == null ? null : Number(data.paymentTermsDays),
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.approvalReason !== undefined && { approvalReason: data.approvalReason }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
      ...(Array.isArray(data._normalizedLines) && totals),
      ...approvalPatch,
      ...(Array.isArray(data._normalizedLines)
        ? {
          lines: {
            create: data._normalizedLines.map((line: any) => ({
              tenantId,
              lineNo: line.lineNo,
              productId: line.productId,
              description: line.description,
              quantityOrdered: line.quantity,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent,
              discountAmount: line.discountAmount,
              taxPercent: line.taxPercent,
              taxAmount: line.taxAmount,
              lineSubtotal: line.lineSubtotal,
              lineTotal: line.lineTotal,
              metadata: line.metadata,
            })),
          },
        }
        : {}),
    },
    include: { lines: true, approvals: true, fulfillmentRequests: true },
  });

  if (approvalDecision?.requiresApproval && existing.approvalStatus !== 'PENDING') {
    await client.salesOrderApproval.createMany({
      data: approvalDecision.triggers.map((trigger) => ({
        tenantId,
        salesOrderId: id,
        status: 'PENDING',
        ruleCode: trigger.code,
        reason: trigger.reason,
        requestedByUserId: userId ?? null,
        metadata: trigger.metadata ?? null,
        decidedAt: null,
      })),
    }).catch((error: any) => {
      console.error('Failed to persist sales approval triggers on update:', error);
    });
  }

  return updated;
}

export async function deleteSalesOrderV2(tenantId: string, id: string) {
  await client.salesOrderV2.deleteMany({ where: { id, tenantId } });
  return { success: true };
}

export async function approveSalesOrderV2(tenantId: string, id: string, userId: string | undefined, data: any) {
  const approval = await client.salesOrderApproval.create({
    data: {
      tenantId,
      salesOrderId: id,
      status: data.status ?? 'APPROVED',
      ruleCode: data.ruleCode ?? 'MANUAL',
      reason: data.reason ?? null,
      requestedByUserId: data.requestedByUserId ?? null,
      approverUserId: userId ?? null,
      decidedAt: new Date(),
      metadata: data.metadata ?? null,
    },
  });

  const order = await client.salesOrderV2.update({
    where: { id },
    data: {
      approvalStatus: approval.status,
      approvedByUserId: userId ?? null,
      approvedAt: new Date(),
      approvalReason: approval.reason ?? null,
      status:
        approval.status === 'APPROVED'
          ? (data.markOrderStatus ?? 'CONFIRMED')
          : (data.markOrderStatus ?? 'PENDING_APPROVAL'),
    },
  });

  await recordOperationalEvent(prisma, {
    tenantId,
    moduleKey: 'sales',
    entityType: 'SALES_ORDER_APPROVAL',
    entityId: approval.id,
    action: approval.status === 'APPROVED' ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
    actorUserId: userId ?? null,
    occurredAt: approval.decidedAt ?? new Date(),
    metadata: {
      salesOrderId: id,
      salesOrderNumber: order.orderNumber,
      approvalStatus: approval.status,
      reason: approval.reason,
    },
  });

  // --- GL POSTING ---
  try {
    if (order.status === 'CONFIRMED' && order.grandTotal > 0) {
      const accounts = await resolveAccountCodes(tenantId, 'sales', 'SALE');
      if (accounts) {
        await postToGL({
          tenantId,
          sourceModule: 'sales',
          sourceDocumentId: order.id,
          sourceDocumentType: 'SalesOrderV2',
          eventType: 'SALE',
          reference: `SO-${order.orderNumber}`,
          description: `Sales Order Confirmed - ${order.orderNumber}`,
          date: new Date(),
          lines: [
            { accountCode: accounts.debitCode, debit: order.grandTotal, credit: 0, description: 'Accounts Receivable' },
            { accountCode: accounts.creditCode, debit: 0, credit: order.grandTotal, description: 'Sales Revenue' }
          ]
        });
      }
    }
  } catch (error) {
    console.error('GL Bridge error (sales order confirmed):', error);
  }

  return { approval, order };
}

export async function createFulfillmentRequestV2(tenantId: string, id: string, userId: string | undefined, data: any) {
  const order = await getSalesOrderV2ById(tenantId, id);
  if (!order) throw new Error('Sales order not found');
  const approvalStatus = String(order.approvalStatus || '').toUpperCase();
  if (approvalStatus === 'PENDING') {
    throw new Error('Order approval is pending; fulfillment cannot start yet');
  }
  if (approvalStatus === 'REJECTED') {
    throw new Error('Order approval was rejected; fulfillment is blocked');
  }

  const request = await client.salesFulfillmentRequest.create({
    data: {
      tenantId,
      salesOrderId: id,
      requestNumber: data.requestNumber ?? `FUL-${Date.now()}`,
      status: data.status ?? 'PENDING',
      fulfillmentType: data.fulfillmentType ?? 'INVENTORY',
      warehouseId: data.warehouseId ?? null,
      branchId: data.branchId ?? null,
      requestedByUserId: userId ?? null,
      metadata: data.metadata ?? null,
    },
  });

  await client.salesOrderV2.update({
    where: { id },
    data: {
      fulfillmentStatus: data.markStatus ?? 'REQUESTED',
      status: data.orderStatus ?? undefined,
    },
  });

  return request;
}
