import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/server/erp-context";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const taxProfileSchema = z.object({
    name: z.string().min(1),
    ratePercent: z.number().min(0).max(100),
    isDefault: z.boolean().default(false),
    regionCode: z.string().optional(),
    branchId: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: "sales", action: "view" });
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("branchId") || undefined;

        const taxProfiles = await prisma.taxProfile.findMany({
            where: { tenantId, ...(branchId ? { branchId } : {}) }
        });

        // Map to API expectation
        const formatted = taxProfiles.map(p => ({
            id: p.id,
            name: p.name,
            ratePercent: p.rate,
            isDefault: p.isDefault,
            regionCode: p.taxRegion || undefined
        }));

        return NextResponse.json({
            data: formatted,
            metadata: { total: formatted.length },
        });
    } catch (error: any) {
        const status = error?.message?.includes("Forbidden") ? 403 : 500;
        return NextResponse.json({ error: status === 403 ? "Forbidden" : "Failed to fetch tax profiles" }, { status });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: "sales", action: "create" });
        const payload = await request.json();
        const data = taxProfileSchema.parse(payload);

        const taxProfile = await prisma.taxProfile.create({
            data: {
                tenantId,
                name: data.name,
                rate: data.ratePercent,
                isDefault: data.isDefault,
                taxRegion: data.regionCode,
                branchId: data.branchId || null
            }
        });

        return NextResponse.json({
            data: {
                id: taxProfile.id,
                name: taxProfile.name,
                ratePercent: taxProfile.rate,
                isDefault: taxProfile.isDefault,
                regionCode: taxProfile.taxRegion || undefined
            }
        }, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
        }
        const status = error?.message?.includes("Forbidden") ? 403 : 500;
        return NextResponse.json({ error: status === 403 ? "Forbidden" : "Failed to create tax profile" }, { status });
    }
}
