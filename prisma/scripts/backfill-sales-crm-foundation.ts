import prisma from '../../src/lib/prisma';
import { bootstrapSalesCrmAllTenants, ensureDefaultBranch } from '../../src/lib/sales-crm/bootstrap';
import { backfillPartyAndCustomerAccountsForTenant } from '../../src/lib/sales-crm/party-sync';

const client = prisma as any;

async function main() {
  console.log('Starting Sales/CRM foundation bootstrap + backfill...');

  const bootstrapped = await bootstrapSalesCrmAllTenants();
  console.log(`Bootstrapped ${bootstrapped.length} tenant(s) with default branch/pipeline`);

  const tenants = await client.tenant.findMany({
    select: { id: true, subdomain: true, companyName: true },
    orderBy: { createdAt: 'asc' },
  });

  let totalSales = 0;
  let totalExport = 0;

  for (const tenant of tenants) {
    const branch = await ensureDefaultBranch(tenant.id);
    const result = await backfillPartyAndCustomerAccountsForTenant(tenant.id, branch.id);
    totalSales += result.salesCount;
    totalExport += result.exportCount;

    console.log(
      `[${tenant.subdomain}] sales customers synced: ${result.salesCount}, export customers synced: ${result.exportCount}`
    );
  }

  console.log('Backfill complete.');
  console.log(`Total sales customers synced: ${totalSales}`);
  console.log(`Total export customers synced: ${totalExport}`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
