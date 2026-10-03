import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSalesOrderV2, listSalesOrdersV2 } from "@/apps/sales/canonical-api";
import { requireTenantContext } from "@/lib/server/erp-context";
import { z } from "zod";

const client = prisma as any;
export const dynamic = "force-dynamic";

const orderLineSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
});

const legacyOrderLineSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).optional(),
  tax: z.number().min(0).max(100).optional(),
});

const v2OrderCreateSchema = z.object({
  mode: z.literal("v2").optional(),
  branchId: z.string().optional().nullable(),
  customerAccountId: z.string().optional().nullable(),
  opportunityId: z.string().optional().nullable(),
  sourceQuoteId: z.string().optional().nullable(),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  approvalStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  invoiceStatus: z.string().optional(),
  currency: z.string().length(3).optional(),
  exchangeRate: z.number().optional().nullable(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional().nullable(),
  incoterms: z.string().optional().nullable(),
  deliveryTerms: z.string().optional().nullable(),
  paymentTermsDays: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  requestApprovalBypass: z.boolean().optional(),
  lines: z.array(orderLineSchema).optional(),
}).passthrough(); // Allowing passthrough for backwards compat and metadata mapping in canonical

const legacyOrderCreateSchema = z.object({
  customerId: z.string().min(1, "Customer ID required for legacy orders"),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional().nullable(),
  grandTotal: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  sourceQuotationId: z.string().optional().nullable(),
  lines: z.array(legacyOrderLineSchema).optional(),
}).passthrough();

function calcLine(line: any) {
  const quantity = Number(line.quantity || 0);
  const unitPrice = Number(line.unitPrice || 0);
  const discount = Number(line.discount || 0);
  const tax = Number(line.tax || 0);
  const subtotal = quantity * unitPrice;
  const afterDiscount = subtotal - (subtotal * discount) / 100;
  const lineTax = (afterDiscount * tax) / 100;
  return {
    productId: line.productId ?? null,
    description: line.description ?? line.productName ?? "Item",
    quantity,
    unitPrice,
    discount,
    tax,
    lineTotal: afterDiscount + lineTax,
  };
}

function mapLegacyOrder(order: any) {
  return {
    ...order,
    orderNumber: order.number,
    subtotal: order.subtotal ?? order.total,
    total: order.total ?? order.grandTotal,
    lines: (order.lines || []).map((l: any) => ({
      id: l.id,
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      tax: l.tax,
      subtotal: l.lineTotal,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: "sales", action: "view" });
    const { searchParams } = new URL(request.url);
    const useV2 = ["1", "true", "v2"].includes((searchParams.get("v2") || "").toLowerCase());

    if (useV2) {
      const items = await listSalesOrdersV2(tenantId, {
        status: searchParams.get("status") || undefined,
        customerAccountId: searchParams.get("customerAccountId") || undefined,
        approvalStatus: searchParams.get("approvalStatus") || undefined,
      });
      return NextResponse.json({ items, metadata: { count: items.length } });
    }

    const statusParam = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const orders = await client.salesOrder.findMany({
      where: {
        tenantId,
        ...(statusParam && { status: statusParam }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: true,
        invoices: true,
        lines: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const items = orders.map(mapLegacyOrder);
    return NextResponse.json({ items, metadata: { count: items.length } });
  } catch (error: any) {
    const status = error?.message?.includes("Forbidden") ? 403 : 500;
    console.error("Error fetching sales orders:", error);
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Failed to fetch sales orders" },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: "sales", action: "create" });
    const body = await request.json();
    const useV2 = body?.mode === "v2" || !!body?.customerAccountId || !!body?.sourceQuoteId;

    if (useV2) {
      const parsedData = v2OrderCreateSchema.parse(body);
      const item = await createSalesOrderV2(tenantId, user.id, parsedData);
      return NextResponse.json({ data: item }, { status: 201 });
    }

    // Legacy handler
    const parsedLegacy = legacyOrderCreateSchema.parse(body);
    const lines = (Array.isArray(parsedLegacy.lines) ? parsedLegacy.lines : []).map(calcLine);
    const subtotal = lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice, 0);
    const discount = lines.reduce(
      (s: number, l: any) => s + (l.quantity * l.unitPrice * (l.discount || 0)) / 100,
      0
    );
    const tax = lines.reduce((s: number, l: any) => {
      const lineSubtotal = l.quantity * l.unitPrice;
      const afterDiscount = lineSubtotal - (lineSubtotal * (l.discount || 0)) / 100;
      return s + (afterDiscount * (l.tax || 0)) / 100;
    }, 0);
    const total = subtotal - discount + tax;

    const order = await client.salesOrder.create({
      data: {
        number: parsedLegacy.orderNumber || `SO-${Date.now()}`,
        status: parsedLegacy.status || "DRAFT",
        customerId: parsedLegacy.customerId,
        orderDate: parsedLegacy.orderDate ? new Date(parsedLegacy.orderDate) : new Date(),
        deliveryDate: parsedLegacy.deliveryDate ? new Date(parsedLegacy.deliveryDate) : null,
        subtotal,
        tax,
        discount,
        total,
        grandTotal: parsedLegacy.grandTotal ?? total,
        notes: parsedLegacy.notes ?? null,
        branchId: parsedLegacy.branchId ?? null,
        sourceQuotationId: parsedLegacy.sourceQuotationId ?? null,
        tenantId,
        ...(lines.length > 0
          ? {
            lines: {
              create: lines.map((l: any) => ({
                tenantId,
                productId: l.productId,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                discount: l.discount,
                tax: l.tax,
                lineTotal: l.lineTotal,
              })),
            },
          }
          : {}),
      },
      include: {
        customer: true,
        invoices: true,
        lines: true,
      },
    });

    return NextResponse.json({ data: mapLegacyOrder(order) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    const message = String(error?.message || "");
    const status = message.includes("Forbidden")
      ? 403
      : /approval|credit|threshold|inactive|invalid|exceed/i.test(message)
        ? 400
        : 500;
    console.error("Error creating sales order:", error);
    return NextResponse.json(
      {
        error:
          status === 403
            ? "Forbidden"
            : status === 500
              ? "Failed to create sales order"
              : message || "Invalid request",
      },
      { status }
    );
  }
}
