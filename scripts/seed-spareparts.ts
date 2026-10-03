
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Spare Parts Data...');

    // 1. Find or Create Demo Tenant
    // In a real scenario, we use the logged-in user's tenant. 
    // For local dev, we often use 'demo' or 'admin'.

    // Try to find a tenant with subdomain 'demo' or 'spareparts'
    let tenant = await prisma.tenant.findFirst({
        where: { OR: [{ subdomain: 'demo' }, { subdomain: 'spareparts' }, { subdomain: 'admin' }] }
    });

    if (!tenant) {
        console.log('No suitable tenant found. Creating "demo" tenant...');
        tenant = await prisma.tenant.create({
            data: {
                name: 'SLICT Auto Parts',
                subdomain: 'demo',
                companyName: 'SLICT Auto Parts Ltd',
                primaryColor: '#C8102E'
            }
        });
    }

    console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Ensure SparePartsConfig exists
    const config = await prisma.sparePartsConfig.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
            tenantId: tenant.id,
            storeName: tenant.name,
            tagline: 'Your Trusted Partner for Auto Parts',
            primaryColor: '#C8102E',
            secondaryColor: '#1E3A5F',
            heroSlides: [
                {
                    id: '1',
                    imageUrl: '',
                    title: 'Premium Brake Components',
                    subtitle: 'Safety First',
                    buttonText: 'View Brakes',
                    buttonLink: '/category/brakes'
                }
            ],
            promoBanners: [
                {
                    id: '1',
                    title: 'Engine Oil Special',
                    subtitle: 'Buy 4L Get Filter Free',
                    link: '/products',
                    bgColor: '#1E3A5F'
                }
            ]
        }
    });
    console.log('Config synced.');

    // 3. Seed Products
    const sampleProducts = [
        {
            name: 'Brembo Brake Pads - Front',
            sku: 'BRM-BP-001',
            category: 'Brake System',
            brand: 'Brembo',
            salePrice: 15500,
            stockQty: 50,
            description: 'High performance ceramic brake pads for Toyota Corolla.',
            compatibleModels: ['Toyota Corolla 2018', 'Toyota Axio 2016']
        },
        {
            name: 'Toyota Oil Filter - Genuine',
            sku: 'TOY-OF-90915',
            category: 'Filters',
            brand: 'Toyota',
            salePrice: 3500,
            stockQty: 200,
            description: 'Genuine oil filter for 1NZ-FE engine.',
            compatibleModels: ['Toyota Allion', 'Toyota Premio', 'Toyota Vitz']
        },
        {
            name: 'KYB Excel-G Shock Absorber (Rear)',
            sku: 'KYB-341307',
            category: 'Suspension',
            brand: 'KYB',
            salePrice: 12000,
            stockQty: 12,
            description: 'Gas shock absorber for Honda Civic FD1.',
            compatibleModels: ['Honda Civic FD1', 'Honda Civic FD4']
        },
        {
            name: 'Denso Iridium Spark Plug',
            sku: 'DNS-IK20',
            category: 'Ignition',
            brand: 'Denso',
            salePrice: 4500,
            stockQty: 100,
            description: 'Long life iridium power plug.',
            compatibleModels: ['Universal', 'Toyota', 'Honda', 'Nissan']
        },
        {
            name: 'Castrol Magnatec 10W-40 (4L)',
            sku: 'CAS-10W40-4L',
            category: 'Lubricants',
            brand: 'Castrol',
            salePrice: 9800,
            stockQty: 45,
            description: 'Synthetic technology engine oil.',
            compatibleModels: ['Universal']
        }
    ];

    for (const p of sampleProducts) {
        await prisma.sparePart.upsert({
            where: {
                tenantId_sku: {
                    tenantId: tenant.id,
                    sku: p.sku
                }
            },
            update: {},
            create: {
                tenantId: tenant.id,
                ...p
            }
        });
    }

    console.log(`Seeded ${sampleProducts.length} products.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
