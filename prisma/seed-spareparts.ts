import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Spare Parts Shop Seeding...');

    // 1. Get Tenant: Find SLICT tenant
    let tenantId = 'T-DEMO-001';

    const slictTenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { name: { contains: 'SLICT', mode: 'insensitive' } },
                { subdomain: { contains: 'slict', mode: 'insensitive' } },
            ]
        }
    });

    if (slictTenant) {
        console.log(`✅ Found SLICT tenant: ${slictTenant.name} (${slictTenant.id})`);
        tenantId = slictTenant.id;
    } else {
        console.log('⚠️ SLICT tenant not found. Using fallback...');
        const anyTenant = await prisma.user.findFirst({ select: { tenantId: true } });
        if (anyTenant) tenantId = anyTenant.tenantId;
    }

    console.log(`Using Tenant ID: ${tenantId}`);

    // Helper to create with error handling
    const safeCreate = async (model: string, data: any) => {
        try {
            return await (prisma as any)[model].create({ data });
        } catch (e: any) {
            if (e.code !== 'P2002') { // Not a unique constraint violation
                console.log(`⚠️ ${model}: ${e.message?.substring(0, 80)}...`);
            }
            return null;
        }
    };

    // 2. Seed Sri Lankan Customers
    console.log('👥 Seeding Sri Lankan Customers...');
    const customersData = [
        {
            customerNumber: 'CUST-20251227-001',
            name: 'Kamal Perera',
            phone: '0771234567',
            email: 'kamal.perera@gmail.com',
            address: 'No. 45, Galle Road',
            city: 'Colombo 03',
            postalCode: '00300',
            customerType: 'RETAIL',
            status: 'ACTIVE',
            tenantId,
        },
        {
            customerNumber: 'CUST-20251227-002',
            name: 'Nimal Silva',
            phone: '0772345678',
            alternatePhone: '0112345678',
            email: 'nimal.silva@yahoo.com',
            address: 'No. 123, Kandy Road',
            city: 'Kadawatha',
            postalCode: '11850',
            customerType: 'MECHANIC',
            businessName: 'Silva Auto Repairs',
            creditLimit: 100000,
            paymentTermDays: 30,
            status: 'ACTIVE',
            tenantId,
        },
        {
            customerNumber: 'CUST-20251227-003',
            name: 'Sunil Fernando',
            phone: '0773456789',
            email: 'sunil.fernando@gmail.com',
            address: 'No. 78, High Level Road',
            city: 'Maharagama',
            postalCode: '10280',
            customerType: 'WHOLESALE',
            businessName: 'Fernando Auto Parts',
            taxId: 'VAT-123456789',
            creditLimit: 500000,
            paymentTermDays: 45,
            status: 'ACTIVE',
            tenantId,
        },
        {
            customerNumber: 'CUST-20251227-004',
            name: 'Ruwan Jayasinghe',
            phone: '0774567890',
            email: 'ruwan.j@outlook.com',
            address: 'No. 56, Station Road',
            city: 'Negombo',
            postalCode: '11500',
            customerType: 'FLEET',
            businessName: 'Jayasinghe Transport',
            taxId: 'VAT-987654321',
            creditLimit: 750000,
            paymentTermDays: 60,
            status: 'ACTIVE',
            tenantId,
        },
        {
            customerNumber: 'CUST-20251227-005',
            name: 'Chaminda Bandara',
            phone: '0775678901',
            email: 'chaminda.b@gmail.com',
            address: 'No. 89, Peradeniya Road',
            city: 'Kandy',
            postalCode: '20000',
            customerType: 'VIP',
            loyaltyPoints: 5000,
            status: 'ACTIVE',
            tenantId,
        },
        {
            customerNumber: 'CUST-20251227-006',
            name: 'Priya Weerasinghe',
            phone: '0776789012',
            address: 'No. 34, Beach Road',
            city: 'Galle',
            postalCode: '80000',
            customerType: 'RETAIL',
            status: 'ACTIVE',
            tenantId,
        },
        {
            customerNumber: 'CUST-20251227-007',
            name: 'Ajith Kumara',
            phone: '0777890123',
            email: 'ajith.kumara@gmail.com',
            address: 'No. 67, Main Street',
            city: 'Matara',
            postalCode: '81000',
            customerType: 'MECHANIC',
            businessName: 'Kumara Auto Service',
            creditLimit: 150000,
            paymentTermDays: 15,
            status: 'ACTIVE',
            tenantId,
        },
        {
            customerNumber: 'CUST-20251227-008',
            name: 'Dinesh Rajapaksha',
            phone: '0778901234',
            address: 'No. 12, Temple Road',
            city: 'Anuradhapura',
            postalCode: '50000',
            customerType: 'RETAIL',
            status: 'ACTIVE',
            tenantId,
        },
    ];

    let createdCustomers = 0;
    for (const customer of customersData) {
        const result = await safeCreate('shopCustomer', customer);
        if (result) createdCustomers++;
    }
    console.log(`✅ Created ${createdCustomers} customers`);

    // 3. Seed Sri Lankan Suppliers
    console.log('🚚 Seeding Sri Lankan Suppliers...');
    const suppliersData = [
        {
            name: 'Lanka Auto Parts (Pvt) Ltd',
            contactPerson: 'Samantha Wijesinghe',
            email: 'sales@lankaautoparts.lk',
            phone: '0112567890',
            address: 'Industrial Zone, Katunayake',
            paymentTermDays: 30,
            leadTimeDays: 3,
            status: 'ACTIVE',
            tenantId,
        },
        {
            name: 'Tokyo Parts Lanka',
            contactPerson: 'Hiroshi Tanaka',
            email: 'orders@tokyoparts.lk',
            phone: '0112678901',
            address: 'Free Trade Zone, Biyagama',
            paymentTermDays: 45,
            leadTimeDays: 7,
            status: 'ACTIVE',
            tenantId,
        },
        {
            name: 'Genuine Parts Distributors',
            contactPerson: 'Mahesh Gunawardena',
            email: 'info@genuineparts.lk',
            phone: '0112789012',
            address: 'Baseline Road, Colombo 09',
            paymentTermDays: 15,
            leadTimeDays: 1,
            status: 'ACTIVE',
            tenantId,
        },
        {
            name: 'Thai Auto Imports',
            contactPerson: 'Somchai Prasert',
            email: 'import@thaiautolk.com',
            phone: '0112890123',
            address: 'Harbor Area, Colombo Port',
            paymentTermDays: 60,
            leadTimeDays: 14,
            status: 'ACTIVE',
            tenantId,
        },
        {
            name: 'China Motor Parts',
            contactPerson: 'Wei Chen',
            email: 'sales@chinamotor.lk',
            phone: '0112901234',
            address: 'Pettah, Colombo 11',
            paymentTermDays: 30,
            leadTimeDays: 21,
            status: 'ACTIVE',
            tenantId,
        },
    ];

    let createdSuppliers = 0;
    for (const supplier of suppliersData) {
        const result = await safeCreate('shopSupplier', supplier);
        if (result) createdSuppliers++;
    }
    console.log(`✅ Created ${createdSuppliers} suppliers`);

    // 4. Seed Products (Get or create category first)
    console.log('🔧 Seeding Spare Parts Products...');

    const partsData = [
        // Toyota Parts
        { sku: 'TOY-OIL-001', name: 'Oil Filter - Toyota Corolla (Genuine)', costPrice: 1800, salePrice: 2500, stockQty: 50, minStockQty: 10, category: 'Automotive Parts' },
        { sku: 'TOY-AIR-001', name: 'Air Filter - Toyota Corolla', costPrice: 1200, salePrice: 1800, stockQty: 35, minStockQty: 8, category: 'Automotive Parts' },
        { sku: 'TOY-BRK-001', name: 'Brake Pads Front - Toyota Corolla', costPrice: 4500, salePrice: 6500, stockQty: 20, minStockQty: 5, category: 'Brake Parts' },
        { sku: 'TOY-BRK-002', name: 'Brake Pads Rear - Toyota Corolla', costPrice: 3800, salePrice: 5500, stockQty: 18, minStockQty: 5, category: 'Brake Parts' },
        { sku: 'TOY-SPK-001', name: 'Spark Plugs Set - Toyota (4pcs)', costPrice: 3200, salePrice: 4800, stockQty: 25, minStockQty: 6, category: 'Engine Parts' },
        { sku: 'TOY-FAN-001', name: 'Fan Belt - Toyota Hilux', costPrice: 2800, salePrice: 4200, stockQty: 15, minStockQty: 4, category: 'Engine Parts' },
        { sku: 'TOY-TIE-001', name: 'Tie Rod End - Toyota Vitz', costPrice: 3200, salePrice: 4500, stockQty: 12, minStockQty: 3, category: 'Suspension' },
        { sku: 'TOY-SHK-001', name: 'Shock Absorber Front - Toyota Axio', costPrice: 8500, salePrice: 12000, stockQty: 8, minStockQty: 2, category: 'Suspension' },
        // Honda Parts
        { sku: 'HON-OIL-001', name: 'Oil Filter - Honda Civic', costPrice: 1600, salePrice: 2200, stockQty: 40, minStockQty: 10, category: 'Filters' },
        { sku: 'HON-AIR-001', name: 'Air Filter - Honda Fit', costPrice: 1100, salePrice: 1600, stockQty: 30, minStockQty: 8, category: 'Filters' },
        { sku: 'HON-BRK-001', name: 'Brake Pads Front - Honda Civic', costPrice: 5200, salePrice: 7500, stockQty: 15, minStockQty: 4, category: 'Brake Parts' },
        { sku: 'HON-TIM-001', name: 'Timing Belt - Honda Fit', costPrice: 6500, salePrice: 9500, stockQty: 10, minStockQty: 3, category: 'Engine Parts' },
        // Nissan Parts
        { sku: 'NIS-OIL-001', name: 'Oil Filter - Nissan X-Trail', costPrice: 1700, salePrice: 2400, stockQty: 28, minStockQty: 7, category: 'Filters' },
        { sku: 'NIS-BRK-001', name: 'Brake Pads Front - Nissan Sunny', costPrice: 4200, salePrice: 6000, stockQty: 14, minStockQty: 4, category: 'Brake Parts' },
        // Suzuki Parts
        { sku: 'SUZ-OIL-001', name: 'Oil Filter - Suzuki Swift', costPrice: 1400, salePrice: 2000, stockQty: 45, minStockQty: 12, category: 'Filters' },
        { sku: 'SUZ-AIR-001', name: 'Air Filter - Suzuki Alto', costPrice: 900, salePrice: 1400, stockQty: 50, minStockQty: 15, category: 'Filters' },
        { sku: 'SUZ-CLU-001', name: 'Clutch Kit - Suzuki Swift', costPrice: 18000, salePrice: 25000, stockQty: 5, minStockQty: 2, category: 'Transmission' },
        // Universal Parts
        { sku: 'UNI-WIP-001', name: 'Wiper Blades 16" (Pair)', costPrice: 800, salePrice: 1200, stockQty: 60, minStockQty: 15, category: 'Accessories' },
        { sku: 'UNI-WIP-002', name: 'Wiper Blades 18" (Pair)', costPrice: 900, salePrice: 1350, stockQty: 55, minStockQty: 15, category: 'Accessories' },
        { sku: 'UNI-WIP-003', name: 'Wiper Blades 20" (Pair)', costPrice: 1000, salePrice: 1500, stockQty: 50, minStockQty: 12, category: 'Accessories' },
        { sku: 'UNI-BAT-001', name: 'Car Battery 12V 45AH', costPrice: 12000, salePrice: 16500, stockQty: 10, minStockQty: 3, category: 'Electrical' },
        { sku: 'UNI-BAT-002', name: 'Car Battery 12V 60AH', costPrice: 15000, salePrice: 21000, stockQty: 8, minStockQty: 2, category: 'Electrical' },
        { sku: 'UNI-COO-001', name: 'Coolant 1L Green', costPrice: 450, salePrice: 750, stockQty: 80, minStockQty: 20, category: 'Fluids' },
        { sku: 'UNI-COO-002', name: 'Coolant 5L Green', costPrice: 1800, salePrice: 3000, stockQty: 25, minStockQty: 8, category: 'Fluids' },
        { sku: 'UNI-OIL-001', name: 'Engine Oil 10W-40 4L', costPrice: 3500, salePrice: 5200, stockQty: 40, minStockQty: 10, category: 'Fluids' },
        { sku: 'UNI-OIL-002', name: 'Engine Oil 5W-30 4L (Full Synthetic)', costPrice: 6500, salePrice: 9500, stockQty: 25, minStockQty: 6, category: 'Fluids' },
        // Low stock items for testing
        { sku: 'TOY-RAD-001', name: 'Radiator - Toyota Premio', costPrice: 25000, salePrice: 35000, stockQty: 2, minStockQty: 3, category: 'Cooling System' },
        { sku: 'HON-ALT-001', name: 'Alternator - Honda Civic', costPrice: 28000, salePrice: 38000, stockQty: 1, minStockQty: 2, category: 'Electrical' },
        { sku: 'NIS-STR-001', name: 'Starter Motor - Nissan Sunny', costPrice: 22000, salePrice: 32000, stockQty: 0, minStockQty: 2, category: 'Electrical' },
    ];

    let createdProducts = 0;
    for (const part of partsData) {
        // Check if exists
        const existing = await (prisma as any).sparePart.findFirst({ where: { sku: part.sku } });
        if (!existing) {
            try {
                await (prisma as any).sparePart.create({
                    data: {
                        ...part,
                        tenantId,
                        isActive: true,
                    },
                });
                createdProducts++;
            } catch (e: any) {
                console.log(`⚠️ Product ${part.sku}: ${e.message?.substring(0, 50)}...`);
            }
        }
    }
    console.log(`✅ Created ${createdProducts} products`);

    // 5. Seed Promotions
    console.log('🏷️ Seeding Promotions...');
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const promotionsData = [
        {
            name: 'New Year Mega Sale',
            description: 'Special discounts for the new year season',
            code: 'NEWYEAR2025',
            type: 'CODE',
            discountType: 'PERCENTAGE',
            discountValue: 15,
            minimumPurchase: 5000,
            maximumDiscount: 10000,
            startDate: now,
            endDate: nextMonth,
            isActive: true,
            targetType: 'ALL_PRODUCTS',
            tenantId,
        },
        {
            name: 'Wholesale Discount',
            description: 'Bulk purchase discount for wholesale customers',
            type: 'AUTOMATIC',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minimumPurchase: 25000,
            startDate: now,
            isActive: true,
            targetType: 'ALL_PRODUCTS',
            tenantId,
        },
        {
            name: 'Free Delivery',
            description: 'Free delivery for orders above Rs. 10,000',
            code: 'FREEDELIVERY',
            type: 'CODE',
            discountType: 'FIXED_AMOUNT',
            discountValue: 500,
            minimumPurchase: 10000,
            startDate: now,
            isActive: true,
            targetType: 'ALL_PRODUCTS',
            tenantId,
        },
    ];

    let createdPromos = 0;
    for (const promo of promotionsData) {
        const result = await safeCreate('shopPromotion', promo);
        if (result) createdPromos++;
    }
    console.log(`✅ Created ${createdPromos} promotions`);

    // 6. Create Sample Invoices
    console.log('💰 Seeding Sample Invoices...');

    const customers = await (prisma as any).shopCustomer.findMany({
        where: { tenantId },
        take: 5
    });

    const products = await (prisma as any).sparePart.findMany({
        where: { tenantId },
        take: 10
    });

    let createdInvoices = 0;
    if (customers.length > 0 && products.length > 0) {
        const invoicesData = [
            { invoiceNumber: 'INV-20251227-001', customer: customers[0], status: 'COMPLETED', paymentStatus: 'PAID' },
            { invoiceNumber: 'INV-20251227-002', customer: customers[1], status: 'COMPLETED', paymentStatus: 'PAID' },
            { invoiceNumber: 'INV-20251227-003', customer: customers[2], status: 'CONFIRMED', paymentStatus: 'PARTIAL' },
            { invoiceNumber: 'INV-20251227-004', customer: null, status: 'COMPLETED', paymentStatus: 'PAID' },
        ];

        for (let i = 0; i < invoicesData.length; i++) {
            const inv = invoicesData[i];

            try {
                // Create invoice
                const invoice = await (prisma as any).shopInvoice.create({
                    data: {
                        invoiceNumber: inv.invoiceNumber,
                        customerId: inv.customer?.id,
                        customerName: inv.customer?.name || 'Walk-in Customer',
                        customerPhone: inv.customer?.phone || '0779999999',
                        status: inv.status,
                        paymentStatus: inv.paymentStatus,
                        subtotal: 0,
                        discountAmount: 0,
                        taxAmount: 0,
                        total: 0,
                        paidAmount: 0,
                        dueAmount: 0,
                        tenantId,
                        createdById: 'system-seed',
                    },
                });

                // Add items
                let subtotal = 0;
                const itemsToAdd = products.slice(i * 2, (i * 2) + 3);

                for (const product of itemsToAdd) {
                    const qty = Math.floor(Math.random() * 3) + 1;
                    const lineTotal = product.salePrice * qty;
                    subtotal += lineTotal;

                    await (prisma as any).shopInvoiceItem.create({
                        data: {
                            invoiceId: invoice.id,
                            productId: product.id,
                            productName: product.name,
                            productSku: product.sku,
                            quantity: qty,
                            unitPrice: product.salePrice,
                            costPrice: product.costPrice,
                            discountPercent: 0,
                            taxRate: 0,
                            lineTotal,
                        },
                    });
                }

                // Update totals
                const total = subtotal;
                const paidAmount = inv.paymentStatus === 'PAID' ? total : inv.paymentStatus === 'PARTIAL' ? Math.floor(total * 0.5) : 0;

                await (prisma as any).shopInvoice.update({
                    where: { id: invoice.id },
                    data: { subtotal, total, paidAmount, dueAmount: total - paidAmount },
                });

                // Create payment
                if (paidAmount > 0) {
                    await (prisma as any).shopInvoicePayment.create({
                        data: { invoiceId: invoice.id, amount: paidAmount, method: 'CASH', tenantId },
                    });
                }

                createdInvoices++;
            } catch (e: any) {
                console.log(`⚠️ Invoice ${inv.invoiceNumber}: ${e.message?.substring(0, 50)}...`);
            }
        }
    }
    console.log(`✅ Created ${createdInvoices} invoices`);

    // 7. Create Reorder Suggestions
    console.log('📦 Creating Reorder Suggestions...');

    const allProducts = await (prisma as any).sparePart.findMany({ where: { tenantId } });
    const lowStock = allProducts.filter((p: any) => p.stockQty <= p.minStockQty);

    let createdReorders = 0;
    for (const product of lowStock) {
        const suggestedQty = Math.max(10, product.minStockQty * 3);
        const result = await safeCreate('shopReorderSuggestion', {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            currentStock: product.stockQty,
            reorderPoint: product.minStockQty,
            suggestedQty,
            avgDailySales: 2.5,
            daysOfStock: product.stockQty / 2.5,
            status: 'PENDING',
            tenantId,
        });
        if (result) createdReorders++;
    }
    console.log(`✅ Created ${createdReorders} reorder suggestions`);

    console.log('\n🎉 Spare Parts Shop Seeding Complete!');
    console.log('-------------------------------------------');
    console.log(`📊 Summary:`);
    console.log(`   • ${createdCustomers} Customers`);
    console.log(`   • ${createdSuppliers} Suppliers`);
    console.log(`   • ${createdProducts} Products`);
    console.log(`   • ${createdPromos} Promotions`);
    console.log(`   • ${createdInvoices} Invoices`);
    console.log(`   • ${createdReorders} Reorder Suggestions`);
    console.log('-------------------------------------------');
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
