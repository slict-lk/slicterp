/**
 * Unified Promotion Engine
 * Handles ALL promotion types: AUTOMATIC, CODE, COUPON, QUANTITY
 */

import { prisma } from '@/lib/prisma';

export interface CartItem {
    productId: string;
    productName: string;
    category: string | null;
    quantity: number;
    unitPrice: number;
}

export interface AppliedPromotion {
    promotionId: string;
    promotionName: string;
    promotionCode: string | null;
    promotionType: string;
    discountAmount: number;
    appliedToItemId?: string;
}

export async function calculatePromotions(params: {
    tenantId: string;
    customerId: string | null;
    items: CartItem[];
    promoCodes?: string[];
}): Promise<{
    appliedPromotions: AppliedPromotion[];
    itemDiscounts: Map<string, number>;
    cartDiscount: number;
    totalDiscount: number;
}> {
    const { tenantId, customerId, items, promoCodes = [] } = params;
    const now = new Date();

    const appliedPromotions: AppliedPromotion[] = [];
    const itemDiscounts = new Map<string, number>();
    let cartDiscount = 0;

    // Get active promotions
    const promotions = await prisma.shopPromotion.findMany({
        where: {
            tenantId,
            isActive: true,
            startDate: { lte: now },
            OR: [
                { endDate: null },
                { endDate: { gte: now } }
            ]
        },
        include: {
            tiers: { orderBy: { minQuantity: 'desc' } },
            targetProducts: true,
            targetAudiences: true
        },
        orderBy: { priority: 'desc' }
    });

    const cartTotal = items.reduce((sum, item) =>
        sum + (item.quantity * Number(item.unitPrice)), 0
    );

    for (const promo of promotions) {
        // Check eligibility
        if (!await isEligible(promo, { customerId, items, cartTotal, promoCodes })) {
            continue;
        }

        // Apply based on type
        if (promo.tiers.length > 0) {
            // QUANTITY promotion - apply per item
            for (const item of items) {
                const tier = findMatchingTier(promo.tiers, item.quantity);
                if (tier && isTargeted(promo, item)) {
                    const discount = calculateTierDiscount(tier, item);
                    itemDiscounts.set(
                        item.productId,
                        (itemDiscounts.get(item.productId) || 0) + discount
                    );

                    appliedPromotions.push({
                        promotionId: promo.id,
                        promotionName: promo.name,
                        promotionCode: promo.code,
                        promotionType: promo.type,
                        discountAmount: discount,
                        appliedToItemId: item.productId
                    });
                }
            }
        } else {
            // CART-LEVEL promotion
            const discount = calculateCartDiscount(promo, cartTotal);
            if (discount > 0) {
                cartDiscount += discount;

                appliedPromotions.push({
                    promotionId: promo.id,
                    promotionName: promo.name,
                    promotionCode: promo.code,
                    promotionType: promo.type,
                    discountAmount: discount
                });
            }
        }
    }

    const totalDiscount = cartDiscount +
        Array.from(itemDiscounts.values()).reduce((sum, d) => sum + d, 0);

    return {
        appliedPromotions,
        itemDiscounts,
        cartDiscount,
        totalDiscount
    };
}

async function isEligible(promo: any, context: any): Promise<boolean> {
    const { customerId, items, cartTotal, promoCodes } = context;

    // Check minimum purchase
    if (promo.minimumPurchase && cartTotal < Number(promo.minimumPurchase)) {
        return false;
    }

    // Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
        return false;
    }

    // Check if code is required and provided
    if (promo.type === 'CODE' || promo.type === 'COUPON') {
        if (!promo.code || !promoCodes.includes(promo.code)) {
            return false;
        }
    }

    // Check target type
    if (promo.targetType === 'SPECIFIC_PRODUCTS') {
        const targetProductIds = promo.targetProducts.map((tp: any) => tp.productId);
        const hasTargetProduct = items.some((item: any) => targetProductIds.includes(item.productId));
        if (!hasTargetProduct) return false;
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
        if (!inTargetAudience) return false;
    }

    return true;
}

function findMatchingTier(tiers: any[], quantity: number): any | null {
    for (const tier of tiers) {
        if (quantity >= tier.minQuantity) {
            if (!tier.maxQuantity || quantity <= tier.maxQuantity) {
                return tier;
            }
        }
    }
    return null;
}

function isTargeted(promo: any, item: CartItem): boolean {
    if (promo.targetType === 'ALL_PRODUCTS') return true;

    if (promo.targetType === 'SPECIFIC_PRODUCTS') {
        const targetProductIds = promo.targetProducts.map((tp: any) => tp.productId);
        return targetProductIds.includes(item.productId);
    }

    if (promo.targetType === 'SPECIFIC_CATEGORIES') {
        return item.category && promo.targetCategories.includes(item.category);
    }

    return false;
}

function calculateTierDiscount(tier: any, item: CartItem): number {
    const lineTotal = item.quantity * Number(item.unitPrice);

    if (tier.discountType === 'PERCENTAGE') {
        return (lineTotal * Number(tier.discountValue)) / 100;
    } else {
        // Fixed amount
        return Number(tier.discountValue);
    }
}

function calculateCartDiscount(promo: any, cartTotal: number): number {
    let discount = 0;

    if (promo.discountType === 'PERCENTAGE') {
        discount = (cartTotal * Number(promo.discountValue)) / 100;
    } else {
        // Fixed amount
        discount = Number(promo.discountValue);
    }

    // Apply maximum discount cap if set
    if (promo.maximumDiscount && discount > Number(promo.maximumDiscount)) {
        discount = Number(promo.maximumDiscount);
    }

    return discount;
}
