
import { prisma } from '@/lib/prisma';

async function main() {
    const subdomain = 'alphamc.pro';
    console.log(`Searching for tenant with subdomain/domain: ${subdomain}`);

    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { subdomain: subdomain },
                { domain: subdomain }
            ]
        },
        select: { id: true, name: true, domain: true, subdomain: true }
    });

    if (tenant) {
        console.log('✅ Tenant Found:', tenant);

        // Check Config
        // @ts-ignore
        const config = await prisma.exportStoreConfig.findUnique({
            where: { tenantId: tenant.id }
        });
        console.log('✅ Config Found:', config);

    } else {
        console.error('❌ Tenant NOT Found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
