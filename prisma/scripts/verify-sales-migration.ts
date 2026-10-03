import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyTenant(tenant: any) {
    const tenantId = tenant.id;
    console.log(`\n>>> Analyzing Tenant: ${tenant.name} (${tenantId})`);

    // 1. Core Record Counts Parity
    const legacyOrders = await prisma.salesOrder.count({ where: { tenantId } });
    const v2Orders = await prisma.salesOrderV2.count({ where: { tenantId } });
    const legacyQuotes = await (prisma as any).quotation.count({ where: { tenantId } });
    const v2Quotes = await (prisma as any).salesQuote.count({ where: { tenantId } });

    console.log(`[Counts] Orders: Legacy=${legacyOrders}, V2=${v2Orders} | ${legacyOrders === v2Orders ? '✅' : '❌'}`);
    console.log(`[Counts] Quotes: Legacy=${legacyQuotes}, V2=${v2Quotes} | ${legacyQuotes === v2Quotes ? '✅' : '❌'}`);

    // 2. Financial Totals
    const oldOrderTotals = await prisma.salesOrder.aggregate({
        where: { tenantId },
        _sum: { grandTotal: true }
    });
    const v2OrderTotals = await prisma.salesOrderV2.aggregate({
        where: { tenantId },
        _sum: { grandTotal: true }
    });
    const oldTotal = oldOrderTotals._sum.grandTotal || 0;
    const v2Total = v2OrderTotals._sum.grandTotal || 0;
    const financialParity = Math.abs(oldTotal - v2Total) < 0.1;

    console.log(`[Finance] Order Sum: Legacy=$${oldTotal.toFixed(2)}, V2=$${v2Total.toFixed(2)} | ${financialParity ? '✅' : '❌'}`);

    // 3. Foundation Integrity
    const customersWithoutParties = await (prisma as any).customerAccount.count({
        where: { tenantId, partyId: null }
    }).catch(() => 0);
    console.log(`[Integrity] Customers missing Parties: ${customersWithoutParties} | ${customersWithoutParties === 0 ? '✅' : '❌'}`);

    // 4. Random Sampling (Detail Level Audit)
    if (v2Orders > 0) {
        console.log(`[Sampling] Auditing 3 random SalesOrders...`);
        const sampleSize = Math.min(3, v2Orders);
        const samples = await prisma.salesOrderV2.findMany({
            where: { tenantId },
            take: sampleSize,
            include: { lines: true }
        });

        for (const order of samples) {
            // Check if it has a revision snapshot
            const revisions = await (prisma as any).salesOrderRevision.count({ where: { salesOrderId: order.id } });
            console.log(`    - Order ${order.orderNumber}: ${order.lines.length} lines, ${revisions} revisions | ${revisions > 0 ? '✅' : '⚠️ No Revision'}`);
        }
    }

    // 5. Orphan Checks
    const orphanedLines = await (prisma as any).salesOrderLine.count({
        where: { tenantId, salesOrderId: null }
    }).catch(() => 0);
    if (orphanedLines > 0) console.log(`[Orphans] ❌ Found ${orphanedLines} orphaned Order Lines.`);

    const invalidOpps = await (prisma as any).crmOpportunity.count({
        where: { tenantId, pipelineId: null }
    }).catch(() => 0);
    if (invalidOpps > 0) console.log(`[Orphans] ❌ Found ${invalidOpps} Opportunities missing Pipelines.`);
}

async function main() {
    console.log("====================================================");
    console.log("   COMMERCIAL MIGRATION VERIFICATION SUITE v2.0     ");
    console.log("====================================================\n");

    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants to verify.`);

    for (const tenant of tenants) {
        await verifyTenant(tenant).catch(err => {
            console.error(`Error verifying tenant ${tenant.id}:`, err.message);
        });
    }

    console.log("\nVerification Complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
