import { NextRequest, NextResponse } from "next/server";
import { createSalesQuote, listSalesQuotes } from "@/apps/sales/canonical-api";
import { requireTenantContext } from "@/lib/server/erp-context";
import { z } from "zod";

export const dynamic = "force-dynamic";

const quoteLineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
});

const quoteCreateSchema = z.object({
  branchId: z.string().optional(),
  customerAccountId: z.string().optional(),
  opportunityId: z.string().optional(),
  quoteNumber: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED", "CONVERTED"]).optional(),
  currency: z.string().length(3).optional(),
  validUntil: z.string().optional(),
  paymentTermsDays: z.number().min(0).optional(),
  notes: z.string().optional(),
  lines: z.array(quoteLineSchema).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: "sales", action: "view" });
    const { searchParams } = new URL(request.url);
    const items = await listSalesQuotes(tenantId, {
      status: searchParams.get("status") || undefined,
      customerAccountId: searchParams.get("customerAccountId") || undefined,
    });
    return NextResponse.json({ items, metadata: { count: items.length } });
  } catch (error: any) {
    const status = error?.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Failed to fetch quotes" },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: "sales", action: "create" });
    const body = await request.json();

    const parsedData = quoteCreateSchema.parse(body);

    const item = await createSalesQuote(tenantId, user.id, parsedData);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    const status = error?.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Failed to create quote" },
      { status }
    );
  }
}
