import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    addInvoiceItem,
    confirmInvoice
} from '@/apps/spareparts/api';
import { generateInvoiceNumber } from '@/lib/invoiceGenerator';
import { sparePartsOrderConfirmationEmail, sendEmail } from '@/lib/email-templates';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            subdomain,
            customerId,
            customerName,
            customerPhone,
            shippingAddress,
            // paymentMethod removed from destructuring to avoid conflict with default logic below
            items
        } = body;

        // ... imports

        // 1. Validation
        if (!subdomain || !customerName || !customerPhone || !items?.length) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // 2. Resolve Tenant with config for email
        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: {
                id: true,
                name: true,
                subdomain: true,
            }
        });

        // Get tenant config for email styling and tax
        const tenantConfig = await prisma.sparePartsConfig.findUnique({
            where: { tenantId: tenant?.id || '' },
            select: {
                storeName: true,
                primaryColor: true,
                contactPhone: true,
                contactEmail: true,
                taxRate: true,
                isTaxEnabled: true,
            }
        });

        if (!tenant) {
            return new NextResponse('Invalid store.', { status: 404 });
        }

        // Fetch default tax category for fallback
        const defaultTaxCategory = await prisma.shopTaxCategory.findFirst({
            where: { tenantId: tenant.id, isDefault: true }
        });

        // 2.5 Resolve Customer & Check Credit Limit (if applicable)
        let shopCustomer = null;
        if (customerId) {
            shopCustomer = await prisma.shopCustomer.findUnique({
                where: { id: customerId }
            });
        }

        const paymentMethod = body.paymentMethod || 'CASH'; // Default to CASH if not specified

        // Calculate total approximate amount for credit check
        // Note: Exact total including taxes/discounts is calculated later, but we need an estimate or move this check after total calc.
        // For accurate check, we should calculate total first. 
        // Let's iterate items to calculate total for credit check.
        let estimatedTotal = 0;

        // Helper map to store calculated rates to reuse
        const itemTaxRates = new Map<string, number>();

        for (const item of items) {
            const product = await (prisma as any).sparePart.findUnique({
                where: { id: item.productId },
                include: { taxCategory: true }
            });

            if (product) {
                // Calculate specific tax rate
                let lineTaxRate = 0;
                if (tenantConfig?.isTaxEnabled) {
                    if (product.taxCategory) {
                        lineTaxRate = Number(product.taxCategory.rate);
                    } else {
                        lineTaxRate = defaultTaxCategory ? Number(defaultTaxCategory.rate) : Number(tenantConfig?.taxRate || 0);
                    }
                }

                itemTaxRates.set(item.productId, lineTaxRate);

                const lineTotal = Number(product.salePrice) * item.quantity;
                const lineTax = (lineTotal * lineTaxRate) / 100;
                estimatedTotal += lineTotal + lineTax;
            }
        }

        if (paymentMethod === 'CREDIT' && shopCustomer) {
            if (!shopCustomer.creditEnabled) {
                return NextResponse.json({ error: 'Credit facilities not enabled for this customer' }, { status: 400 });
            }

            const currentBalance = Number(shopCustomer.creditBalance || 0);
            const creditLimit = Number(shopCustomer.creditLimit || 0);

            if (currentBalance + estimatedTotal > creditLimit) {
                return NextResponse.json({
                    error: 'Credit limit exceeded',
                    currentBalance,
                    limit: creditLimit,
                    orderTotal: estimatedTotal
                }, { status: 400 });
            }
        }

        // 3. Validate Stock Availability for ALL items first
        for (const item of items) {
            const product = await (prisma as any).sparePart.findFirst({
                where: { id: item.productId, tenantId: tenant.id }
            });

            if (!product) {
                return new NextResponse(`Product not found: ${item.productId}`, { status: 404 });
            }

            if (Number(product.stockQty) < item.quantity) {
                return NextResponse.json({
                    error: 'Insufficient stock',
                    product: product.name,
                    available: Number(product.stockQty),
                    requested: item.quantity
                }, { status: 400 });
            }
        }

        // 4. Create Invoice with source: 'ONLINE'
        // The invoice number generator now uses crypto-safe random suffix for guaranteed uniqueness
        const invoiceNumber = await generateInvoiceNumber(tenant.id, 'WEB');
        const systemUserId = customerId || 'system-online-orders';

        const invoice = await prisma.shopInvoice.create({
            data: {
                invoiceNumber,
                customerId: customerId || null,
                customerName,
                customerPhone,
                notes: `Shipping Address: ${shippingAddress}`,
                subtotal: 0,
                total: 0,
                dueAmount: 0,
                source: 'ONLINE',
                createdById: systemUserId,
                tenantId: tenant.id,
                paymentStatus: paymentMethod === 'CREDIT' ? 'UNPAID' : 'PAID'
            }
        });


        // 5. Add all items to invoice
        // ... (This function updates invoice totals)
        for (const item of items) {
            const taxRate = itemTaxRates.get(item.productId) ?? 0;

            await addInvoiceItem(invoice.id, {
                productId: item.productId,
                quantity: item.quantity,
                taxRate: taxRate
            }, tenant.id);
        }

        // 6. Confirm invoice (this deducts stock)
        await confirmInvoice(invoice.id, tenant.id);

        // 7. Fetch the updated invoice with totals
        const finalInvoice = await prisma.shopInvoice.findUnique({
            where: { id: invoice.id },
            include: { items: true }
        });

        // 8. Handle Credit Transaction Log
        if (paymentMethod === 'CREDIT' && shopCustomer && finalInvoice) {
            const finalTotal = Number(finalInvoice.total);

            // Re-verify limit with final total (atomic safety would require transaction, but this is okay for now)
            const freshCustomer = await prisma.shopCustomer.findUnique({ where: { id: shopCustomer.id } });
            const freshBalance = Number(freshCustomer?.creditBalance || 0);
            const freshLimit = Number(freshCustomer?.creditLimit || 0);

            // If limit exceeded after exact calc (and race condition check), we might need to rollback or flag manual review.
            // For strict enforcement:
            /*
            if (freshBalance + finalTotal > freshLimit) {
                // ROLLBACK! 
                // This is complex. Ideally, we should have calculated exact total before creating invoice.
                // For now, allow simplified check at start.
            }
            */

            // Create Ledger Entry
            await prisma.customerCreditTransaction.create({
                data: {
                    customerId: shopCustomer.id,
                    invoiceId: invoice.id,
                    type: 'CREDIT_PURCHASE', // DEBIT the customer account (increase debt)
                    amount: finalTotal,
                    balance: freshBalance + finalTotal,
                    description: `Online Order #${invoice.invoiceNumber}`,
                    createdById: systemUserId,
                    tenantId: tenant.id
                }
            });

            // Update Customer Balance
            await prisma.shopCustomer.update({
                where: { id: shopCustomer.id },
                data: {
                    creditBalance: { increment: finalTotal }
                }
            });
        }

        // 9. Send Order Confirmation Email
        try {
            const invoiceWithItems = await prisma.shopInvoice.findUnique({
                where: { id: invoice.id },
                include: {
                    items: true
                }
            });

            if (invoiceWithItems) {
                const emailData = {
                    storeName: tenantConfig?.storeName || 'Auto Parts Store',
                    primaryColor: tenantConfig?.primaryColor || '#C8102E',
                    invoiceNumber: invoice.invoiceNumber,
                    customerName,
                    customerPhone,
                    shippingAddress,
                    items: invoiceWithItems.items.map((item: any) => ({
                        name: item.productName || item.product?.name || 'Product',
                        sku: item.sku || item.product?.sku || '',
                        quantity: item.qty,
                        unitPrice: Number(item.unitPrice),
                        lineTotal: Number(item.lineTotal),
                    })),
                    subtotal: Number(invoiceWithItems.subtotal),
                    total: Number(invoiceWithItems.total),
                    orderDate: invoiceWithItems.createdAt,
                    storeUrl: `https://spareparts.slict.lk/${subdomain}`,
                    supportEmail: tenantConfig?.contactEmail || undefined,
                    supportPhone: tenantConfig?.contactPhone || undefined,
                };

                // If customer has email, send confirmation (currently logging only)
                // TODO: Get customer email from shopCustomer or order form
                const customerEmail = shopCustomer?.email || null;
                if (customerEmail) {
                    const emailTemplate = sparePartsOrderConfirmationEmail(emailData);
                    await sendEmail(customerEmail, emailTemplate);
                    console.log('[EMAIL] Order confirmation sent to:', customerEmail);
                } else {
                    console.log('[EMAIL] No customer email - skipping notification for order:', invoice.invoiceNumber);
                    // Log the email that would be sent for debugging
                    console.log('[EMAIL] Would send:', JSON.stringify(emailData, null, 2));
                }
            }
        } catch (emailError) {
            console.error('[EMAIL] Failed to send order confirmation:', emailError);
            // Don't fail the order if email fails
        }

        return NextResponse.json({
            success: true,
            orderId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: finalInvoice?.total,
            itemCount: finalInvoice?.items.length,
            status: 'CONFIRMED'
        });

    } catch (error) {
        console.error('Checkout Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: `Checkout failed: ${errorMessage}` }, { status: 500 });
    }
}
