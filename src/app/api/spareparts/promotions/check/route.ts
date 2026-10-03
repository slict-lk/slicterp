import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Maximum discount cap (30% of cart total)
const MAX_DISCOUNT_PERCENT = 30;

// POST /api/spareparts/promotions/check - Check applicable promotions for cart
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { items, customerId } = body;

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Items array required' }, { status: 400 });
        }

        const now = new Date();
        const cartTotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
        const maxDiscount = (cartTotal * MAX_DISCOUNT_PERCENT) / 100;

        // Get all active order-level promotions (from shopPromotion)
        const orderPromotions = await prisma.shopPromotion.findMany({
            where: {
                tenantId: user.tenantId,
                isActive: true,
                startDate: { lte: now },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ]
            },
            include: {
                targetProducts: true,
                targetAudiences: true
            },
            orderBy: { priority: 'desc' }
        });

        // Get quantity-based promotions (from sparePromotion)
        const quantityPromotions = await (prisma as any).sparePromotion.findMany({
            where: {
                tenantId: user.tenantId,
                type: 'QUANTITY',
                isActive: true,
                startDate: { lte: now },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ]
            },
            include: {
                tiers: { orderBy: { minQuantity: 'asc' } }
            }
        });

        const applicablePromotions: any[] = [];

        // ========================================
        // SMART STACKING LOGIC
        // ========================================

        // 1. Find BEST order-level promotion per type (only one AUTOMATIC, one CODE)
        let bestAutomatic: any = null;
        let bestAutomaticAmount = 0;

        for (const promo of orderPromotions) {
            // Skip non-automatic for this pass
            if (promo.type !== 'AUTOMATIC') continue;

            // Check minimum purchase
            if (promo.minimumPurchase && cartTotal < Number(promo.minimumPurchase)) continue;

            // Check usage limit
            if (promo.usageLimit && promo.usageCount >= promo.usageLimit) continue;

            // Check target type
            if (promo.targetType === 'SPECIFIC_PRODUCTS') {
                const targetProductIds = promo.targetProducts.map((tp: any) => tp.productId);
                const hasTargetProduct = items.some((item: any) => targetProductIds.includes(item.productId));
                if (!hasTargetProduct) continue;
            }

            // Check audience targeting
            if (promo.targetAudiences.length > 0 && customerId) {
                const customerAudiences = await prisma.shopCustomerAudienceMember.findMany({
                    where: { customerId },
                    select: { audienceId: true }
                });
                const customerAudienceIds = customerAudiences.map(ca => ca.audienceId);
                const targetAudienceIds = promo.targetAudiences.map((ta: any) => ta.audienceId);
                const inTargetAudience = targetAudienceIds.some((id: string) => customerAudienceIds.includes(id));
                if (!inTargetAudience) continue;
            }

            // Calculate discount amount
            let discountAmount = 0;
            if (promo.discountType === 'PERCENTAGE') {
                discountAmount = (cartTotal * Number(promo.discountValue)) / 100;
                if (promo.maximumDiscount) {
                    discountAmount = Math.min(discountAmount, Number(promo.maximumDiscount));
                }
            } else {
                discountAmount = Number(promo.discountValue);
            }

            // Keep only the best one
            if (discountAmount > bestAutomaticAmount) {
                bestAutomatic = promo;
                bestAutomaticAmount = discountAmount;
            }
        }

        // Add best automatic promotion
        if (bestAutomatic) {
            applicablePromotions.push({
                id: bestAutomatic.id,
                name: bestAutomatic.name,
                description: bestAutomatic.description,
                code: bestAutomatic.code,
                type: bestAutomatic.type,
                discountType: bestAutomatic.discountType,
                discountValue: Number(bestAutomatic.discountValue),
                discountAmount: bestAutomaticAmount,
                minimumPurchase: bestAutomatic.minimumPurchase ? Number(bestAutomatic.minimumPurchase) : null,
                source: 'ORDER'
            });
        }

        // 2. Check quantity-based promotions for each item (these can stack per-item)
        for (const item of items) {
            for (const promo of quantityPromotions) {
                let isTargeted = false;

                if (promo.targetScope === 'ALL') {
                    isTargeted = true;
                } else if (promo.targetScope === 'PRODUCT' && promo.targetProducts?.includes(item.productId)) {
                    isTargeted = true;
                } else if (promo.targetScope === 'CATEGORY' && item.category && promo.targetCategories?.includes(item.category)) {
                    isTargeted = true;
                }

                if (!isTargeted) continue;

                for (const tier of promo.tiers) {
                    if (item.quantity >= tier.minQuantity) {
                        if (tier.maxQuantity === null || item.quantity <= tier.maxQuantity) {
                            let discountAmount = 0;
                            if (tier.discountType === 'PERCENTAGE') {
                                discountAmount = (item.quantity * item.unitPrice * Number(tier.discountValue)) / 100;
                            } else {
                                discountAmount = Number(tier.discountValue);
                            }

                            // Prevent duplicate promos for same product
                            const exists = applicablePromotions.some(p =>
                                p.id === promo.id && p.productId === item.productId
                            );

                            if (!exists) {
                                applicablePromotions.push({
                                    id: promo.id,
                                    name: promo.name,
                                    description: promo.description,
                                    type: 'QUANTITY',
                                    discountType: tier.discountType,
                                    discountValue: Number(tier.discountValue),
                                    discountAmount,
                                    minQuantity: tier.minQuantity,
                                    productId: item.productId,
                                    productName: item.productName,
                                    source: 'QUANTITY'
                                });
                            }
                            break;
                        }
                    }
                }
            }
        }

        // ========================================
        // APPLY DISCOUNT CAP
        // ========================================
        let totalDiscount = applicablePromotions.reduce((sum, p) => sum + p.discountAmount, 0);
        let cappedDiscount = totalDiscount;
        let discountCapped = false;

        if (totalDiscount > maxDiscount) {
            cappedDiscount = maxDiscount;
            discountCapped = true;

            // Proportionally reduce each discount
            const ratio = maxDiscount / totalDiscount;
            applicablePromotions.forEach(p => {
                p.discountAmount = Math.round(p.discountAmount * ratio * 100) / 100;
            });
        }

        return NextResponse.json({
            promotions: applicablePromotions,
            totalDiscount: cappedDiscount,
            cartTotal,
            discountCapped,
            maxDiscountPercent: MAX_DISCOUNT_PERCENT
        });
    } catch (error) {
        console.error('Error checking promotions:', error);
        return NextResponse.json(
            { error: 'Failed to check promotions' },
            { status: 500 }
        );
    }
}
