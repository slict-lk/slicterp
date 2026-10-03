import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Tax System Seeding...');

    // 1. Get all tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
        console.log(`Processing tenant: ${tenant.name} (${tenant.subdomain})`);

        // 2. Create Default Tax Category (Standard VAT 18%)
        const existingStandard = await prisma.shopTaxCategory.findFirst({
            where: { tenantId: tenant.id, name: 'Standard VAT' }
        });

        if (!existingStandard) {
            await prisma.shopTaxCategory.create({
                data: {
                    name: 'Standard VAT',
                    rate: 18.0,
                    description: 'Standard Value Added Tax',
                    isDefault: true,
                    tenantId: tenant.id
                }
            });
            console.log('   ✅ Created "Standard VAT" category');
        } else {
            console.log('   ℹ️ "Standard VAT" category exists');
        }

        // 3. Create Exempt Tax Category (0%)
        const existingExempt = await prisma.shopTaxCategory.findFirst({
            where: { tenantId: tenant.id, name: 'Tax Exempt' }
        });

        if (!existingExempt) {
            await prisma.shopTaxCategory.create({
                data: {
                    name: 'Tax Exempt',
                    rate: 0.0,
                    description: 'Items exempt from tax',
                    isDefault: false,
                    tenantId: tenant.id
                }
            });
            console.log('   ✅ Created "Tax Exempt" category');
        }

        // 4. Update SparePartsConfig
        const config = await prisma.sparePartsConfig.findUnique({
            where: { tenantId: tenant.id }
        });

        if (config) {
            await prisma.sparePartsConfig.update({
                where: { id: config.id },
                data: {
                    isTaxEnabled: true,
                    // If no tax reg no, maybe set a placeholder or leave null
                    // taxRegistrationNumber: 'VAT-PENDING' 
                }
            });
            console.log('   ✅ Enabled Tax in Configuration');
        }
    }

    console.log('🎉 Tax Seeding Complete!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
