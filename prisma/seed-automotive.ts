import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL not found');
}

const url = new URL(connectionString);
url.searchParams.delete('sslmode');

const pool = new pg.Pool({
    connectionString: url.toString(),
    max: 2,
    ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log('🌱 Starting Automotive Seeding...');

    // 1. Get Tenant: Try to find 'SLICT' first, or fallback
    let tenantId = 'T-DEMO-001'; // Default Fallback

    const slictTenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { name: { contains: 'SLICT', mode: 'insensitive' } },
                { subdomain: { contains: 'slict', mode: 'insensitive' } },
                { id: 'SLICT' } // Just in case
            ]
        }
    });

    if (slictTenant) {
        console.log(`✅ Found core SLICT tenant: ${slictTenant.name} (${slictTenant.id})`);
        tenantId = slictTenant.id;
    } else {
        console.log('⚠️ SLICT tenant not found. Falling back to simple search...');
        // Try finding ANY tenant if SLICT missing
        const anyTenant = await prisma.user.findFirst({ select: { tenantId: true } });
        if (anyTenant) tenantId = anyTenant.tenantId;
    }

    const tenant = tenantId; // Keep variable name consistent with rest of script
    console.log(`Using Target Tenant ID: ${tenant}`);

    // 2. Seed Warehouse
    console.log('🏭 Seeding Warehouse...');
    const warehouse = await prisma.warehouse.upsert({
        where: { code: 'MAIN' },
        update: {},
        create: {
            name: 'Main Distribution Center',
            code: 'MAIN',
            address: '42 Industrial Zone, Colombo',
            tenantId: tenant,
        }
    });

    // 3. Seed Vehicles
    console.log('🚗 Seeding Vehicles...');
    const vehiclesData = [
        { make: 'Toyota', model: 'Corolla', yearStart: 2014, yearEnd: 2019, engine: '1ZR-FE' },
        { make: 'Toyota', model: 'Corolla', yearStart: 2000, yearEnd: 2006, engine: '1NZ-FE' },
        { make: 'Toyota', model: 'Hilux', yearStart: 2015, yearEnd: null, engine: '1GD-FTV' },
        { make: 'Toyota', model: 'Vitz', yearStart: 2017, yearEnd: 2020, engine: '1KR-FE' },
        { make: 'Honda', model: 'Civic', yearStart: 2016, yearEnd: 2021, engine: 'L15B7' },
        { make: 'Honda', model: 'Fit', yearStart: 2013, yearEnd: 2020, engine: 'LEB' },
        { make: 'Nissan', model: 'X-Trail', yearStart: 2014, yearEnd: 2022, engine: 'MR20DD' },
        { make: 'Suzuki', model: 'Swift', yearStart: 2017, yearEnd: null, engine: 'K10C' },
    ];

    for (const v of vehiclesData) {
        await (prisma as any).vehicle.upsert({
            where: {
                tenantId_make_model_yearStart_engine: {
                    tenantId: tenant,
                    make: v.make,
                    model: v.model,
                    yearStart: v.yearStart,
                    engine: v.engine || ''
                }
            },
            update: {},
            create: { ...v, tenantId: tenant },
        }).catch((e: any) => {
            // Ignore unique constraint violations if simpler match fails
        });
    }

    // 4. Seed Parts (Product + AutomotivePart)
    console.log('🔧 Seeding Parts...');
    const partsData = [
        {
            sku: '90915-YZZE1',
            name: 'Oil Filter (Genuine)',
            type: 'SPARE_PART',
            price: 2500,
            cost: 1800,
            stock: 50,
            oem: '90915-YZZE1',
            origin: 'THAILAND',
            fits: ['Toyota Corolla (2000-2006)', 'Toyota Vitz (2017-2020)'],
            rack: 'A-01'
        },
        {
            sku: '45046-09281',
            name: 'Tie Rod End',
            type: 'SPARE_PART',
            price: 4500,
            cost: 3200,
            stock: 12,
            oem: '45046-09281',
            origin: 'JAPAN',
            fits: ['Toyota Hilux (2015-Present)'],
            rack: 'B-04'
        },
        {
            sku: '6205-2RS',
            name: 'Deep Groove Ball Bearing 6205',
            type: 'BEARING',
            price: 1200,
            cost: 800,
            stock: 100,
            dims: { d: 25, D: 52, B: 15 },
            brandOrigin: 'KOYO',
            fits: [],
            rack: 'C-10'
        },
        {
            sku: '0W-20-4L',
            name: 'Synthetic Engine Oil 0W-20 (4L)',
            type: 'LUBRICANT',
            price: 18500,
            cost: 14000,
            stock: 24,
            origin: 'UAE',
            fits: ['Honda Civic (2016-2021)', 'Honda Fit (2013-2020)'],
            rack: 'LUB-1'
        },
        {
            sku: 'BP-2390',
            name: 'Brake Pad Set (Front)',
            type: 'SPARE_PART',
            price: 8500,
            cost: 5500,
            stock: 4, // Low stock
            origin: 'MALAYSIA',
            fits: ['Nissan X-Trail (2014-2022)'],
            rack: 'B-12'
        }
    ];

    for (const part of partsData) {
        // Create Core Product
        const product = await prisma.product.upsert({
            where: { sku: part.sku },
            update: { stockQty: part.stock },
            create: {
                tenantId: tenant,
                name: part.name,
                sku: part.sku,
                salePrice: part.price,
                costPrice: part.cost,
                stockQty: part.stock,
                minStockQty: 5,
                category: 'Automotive',
                isActive: true,
                type: 'STORABLE'
            }
        });

        // Create Automotive Extension
        await (prisma as any).automotivePart.upsert({
            where: { productId: product.id },
            update: {},
            create: {
                tenantId: tenant,
                productId: product.id,
                partType: part.type as any,
                oemCode: part.oem,
                brandOrigin: part.origin || part.brandOrigin,
                vehicleModels: part.fits,
                rackLocation: part.rack,
                condition: 'NEW',
                // Add bearing dims if present
                innerDiameter: part.dims?.d,
                outerDiameter: part.dims?.D,
                width: part.dims?.B,
            }
        });

        // 5. Seed Stock Movements (History)
        if (part.stock > 0) {
            // Initial Stock In
            await prisma.stockMovement.create({
                data: {
                    tenantId: tenant,
                    productId: product.id,
                    warehouseId: warehouse.id,
                    type: 'IN',
                    quantity: part.stock,
                    notes: 'Initial Seeding',
                    movementDate: new Date(new Date().setDate(new Date().getDate() - 30)) // 30 days ago
                }
            });
        }

        // Add random adjustment records for "Recent Activity"
        if (Math.random() > 0.5) {
            await prisma.stockMovement.create({
                data: {
                    tenantId: tenant,
                    productId: product.id,
                    warehouseId: warehouse.id,
                    type: 'OUT',
                    quantity: 1,
                    notes: 'Counter Sales',
                    movementDate: new Date() // Today
                }
            });

            // Fix stock count
            await prisma.product.update({
                where: { id: product.id },
                data: { stockQty: { decrement: 1 } }
            });
        }
    }

    console.log('✅ Seeding Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
