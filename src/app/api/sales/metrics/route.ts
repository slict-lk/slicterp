import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/server/erp-context";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
    branchId: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: "sales", action: "view" });
        const { searchParams } = new URL(request.url);

        const validated = querySchema.parse({
            branchId: searchParams.get("branchId") || undefined,
        });
        const branchId = validated.branchId;

        // Aggregate Opportunities (CRM Pipeline)
        const pipelineData = await (prisma as any).crmOpportunity.aggregate({
            where: { tenantId, branchId, status: "OPEN" },
            _sum: { amount: true },
            _count: { id: true },
        }).catch(() => null);

        // Aggregate Quotes (Sales Pipeline)
        const quoteData = await (prisma as any).salesQuote.aggregate({
            where: { tenantId, branchId, status: "SENT" },
            _sum: { grandTotal: true },
            _count: { id: true },
        }).catch(() => null);

        // Aggregate Orders awaiting fulfillment/approval
        const pendingOrders = await (prisma as any).salesOrderV2.count({
            where: {
                tenantId,
                branchId,
                OR: [
                    { approvalStatus: "PENDING" },
                    { fulfillmentStatus: "REQUESTED" },
                ],
            },
        }).catch(() => 0);

        // Count active leads
        const activeLeadsCount = await (prisma as any).crmLead.count({
            where: { tenantId, status: { in: ["NEW", "CONTACTED"] } }
        }).catch(() => 0);

        return NextResponse.json({
            data: {
                pipelineValue: pipelineData?._sum?.amount || 0,
                activeOpportunities: pipelineData?._count?.id || 0,
                leadCount: activeLeadsCount,
                pipeline: {
                    totalOpportunities: pipelineData?._count?.id || 0,
                    expectedValue: pipelineData?._sum?.amount || 0,
                },
                quotes: {
                    activeSentQuotes: quoteData?._count?.id || 0,
                    quotePipelineValue: quoteData?._sum?.grandTotal || 0,
                },
                orders: {
                    pendingActionCount: pendingOrders || 0,
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        const status = error?.message?.includes("Forbidden") ? 403 : 500;
        return NextResponse.json({ error: status === 403 ? "Forbidden" : "Failed to load sales metrics" }, { status });
    }
}
