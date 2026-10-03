const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Find the tenant
    const tenant = await p.tenant.findUnique({
        where: { subdomain: 'SLICTHOTEL' }
    });

    console.log('Tenant found:', tenant ? 'Yes' : 'No');
    if (tenant) {
        console.log('  ID:', tenant.id);
        console.log('  Name:', tenant.name);
        console.log('  Subdomain:', tenant.subdomain);

        // Check if HotelConfig exists
        const config = await p.hotelConfig.findUnique({
            where: { tenantId: tenant.id }
        });

        console.log('\nHotelConfig:', config ? 'Exists' : 'MISSING - Need to create!');
        if (config) {
            console.log('  Hotel Name:', config.hotelName);
        }
    }

    // Also try lowercase
    const tenantLower = await p.tenant.findFirst({
        where: { subdomain: { equals: 'slicthotel', mode: 'insensitive' } }
    });

    if (tenantLower && tenantLower.subdomain !== 'SLICTHOTEL') {
        console.log('\nNote: Found tenant with different case:', tenantLower.subdomain);
    }
}

main().finally(() => p.$disconnect());
