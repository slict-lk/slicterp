import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/server/erp-context";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const priceListSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  currency: z.string().length(3).default("USD"),
  isActive: z.boolean().default(true),
  branchId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: "sales", action: "view" });
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || undefined;

    const priceLists = await prisma.priceList.findMany({
      where: { tenantId, ...(branchId ? { branchId } : {}) },
      include: { _count: { select: { items: true } } }
    });

    return NextResponse.json({
      data: priceLists,
      metadata: { total: priceLists.length, page: 1, limit: 100 },
    });
  } catch (error: any) {
    const status = error?.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Failed to fetch price lists" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: "sales", action: "create" });
    const payload = await request.json();
    const data = priceListSchema.parse(payload);

    // Ensure uniqueness manually or rely on DB
    const existing = await prisma.priceList.findUnique({
      where: { tenantId_code: { tenantId, code: data.code } }
    });

    if (existing) {
      return NextResponse.json({ error: "Price List code already in use" }, { status: 409 });
    }

    const priceList = await prisma.priceList.create({
      data: {
        ...data,
        tenantId,
        metadata: data.metadata || {}
      }
    });

    return NextResponse.json({ data: priceList }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Failed to create price list" }, { status });
  }
}
