
import { prisma } from '@/lib/prisma';

async function main() {
    console.log('--- Tenants ---');
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true, subdomain: true, domain: true }
    });
    console.log(JSON.stringify(tenants, null, 2));

    console.log('\n--- ExportStoreConfigs ---');
    // @ts-ignore
    const configs = await prisma.exportStoreConfig.findMany({
        select: { id: true, tenantId: true, storeName: true }
    });
    console.log(JSON.stringify(configs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
