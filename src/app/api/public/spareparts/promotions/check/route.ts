import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Maximum discount cap (30% of cart total)
const MAX_DISCOUNT_PERCENT = 30;

// POST /api/public/spareparts/promotions/check - Check applicable promotions for storefront cart
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items, customerId, promoCode, subdomain } = body;

        if (!subdomain) {
            return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
        }

        // Find tenant by subdomain
        const tenant = await prisma.tenant.findFirst({
            where: { subdomain }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Items array required' }, { status: 400 });
        }

        const now = new Date();
        const cartTotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.price, 0);
        const maxDiscount = (cartTotal * MAX_DISCOUNT_PERCENT) / 100;

        // Build promotion query
        const promotionWhere: any = {
            tenantId: tenant.id,
            isActive: true,
            startDate: { lte: now },
            OR: [
                { endDate: null },
                { endDate: { gte: now } }
            ]
        };

        // Get automatic promotions
        const automaticPromotions = await prisma.shopPromotion.findMany({
            where: {
                ...promotionWhere,
                type: 'AUTOMATIC'
            },
            include: {
                targetProducts: true,
                targetAudiences: true
            },
            orderBy: { priority: 'desc' }
        });

        // Check for promo code if provided
        let codePromotion = null;
        let codeError = null;
        if (promoCode) {
            const promotion = await prisma.shopPromotion.findFirst({
                where: {
                    ...promotionWhere,
                    code: { equals: promoCode, mode: 'insensitive' },
                    type: { in: ['CODE', 'COUPON'] }
                },
                include: {
                    targetProducts: true,
                    targetAudiences: true
                }
            });

            if (!promotion) {
                codeError = 'Invalid promo code';
            } else if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
                codeError = 'Promo code has reached its usage limit';
            } else if (promotion.minimumPurchase && cartTotal < Number(promotion.minimumPurchase)) {
                codeError = `Minimum purchase of LKR ${Number(promotion.minimumPurchase).toLocaleString()} required`;
            } else {
                codePromotion = promotion;
            }
        }

        // Get quantity-based promotions  
        const quantityPromotions = await (prisma as any).sparePromotion.findMany({
            where: {
                tenantId: tenant.id,
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

        // 1. Find BEST automatic promotion (only one applies)
        let bestAutomatic: any = null;
        let bestAutomaticAmount = 0;

        for (const promo of automaticPromotions) {
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
                type: 'AUTOMATIC',
                discountType: bestAutomatic.discountType,
                discountValue: Number(bestAutomatic.discountValue),
                discountAmount: bestAutomaticAmount,
                source: 'AUTOMATIC'
            });
        }

        // 2. Add code promotion (only one allowed - already enforced by single input)
        if (codePromotion) {
            let discountAmount = 0;
            if (codePromotion.discountType === 'PERCENTAGE') {
                discountAmount = (cartTotal * Number(codePromotion.discountValue)) / 100;
                if (codePromotion.maximumDiscount) {
                    discountAmount = Math.min(discountAmount, Number(codePromotion.maximumDiscount));
                }
            } else {
                discountAmount = Number(codePromotion.discountValue);
            }

            applicablePromotions.push({
                id: codePromotion.id,
                name: codePromotion.name,
                description: codePromotion.description,
                code: codePromotion.code,
                type: 'CODE',
                discountType: codePromotion.discountType,
                discountValue: Number(codePromotion.discountValue),
                discountAmount,
                source: 'CODE'
            });
        }

        // 3. Check quantity-based promotions for each item (these can stack per-item)
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
                                discountAmount = (item.quantity * item.price * Number(tier.discountValue)) / 100;
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
                                    productName: item.name,
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
            codeError,
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
