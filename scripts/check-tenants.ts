
import { prisma } from '../src/lib/prisma';

async function main() {
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, subdomain: true } });
    const counts = await prisma.sparePart.groupBy({
        by: ['tenantId'],
        _count: {
            id: true
        }
    });

    const countMap = new Map();
    counts.forEach(c => countMap.set(c.tenantId, c._count.id));

    console.log('--- Tenant Diagnosis ---');
    tenants.forEach(t => {
        console.log(`Tenant: ${t.name} (Subdomain: ${t.subdomain}) - ID: ${t.id}`);
        console.log(`Product Count: ${countMap.get(t.id) || 0}`);
        console.log('------------------------');
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
