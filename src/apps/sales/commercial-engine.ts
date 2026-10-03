import { prisma } from '@/lib/prisma';

/**
 * Resolves the applicable unit price for a given product by evaluating PriceLists.
 * Rule Precedence:
 * 1. Active Customer-specific PriceList (via tags or direct mapping if available)
 * 2. Active Branch-specific PriceList (branchId match)
 * 3. Base Product Price
 */
export async function resolveApplicablePrice(params: {
    tenantId: string;
    productId: string;
    branchId?: string | null;
    customerAccountId?: string | null;
    currency?: string;
    fallbackPrice?: number;
}) {
    const { tenantId, productId, branchId, currency = 'USD', fallbackPrice = 0 } = params;

    // Find all active price lists for this tenant and currency
    const activeLists = await (prisma as any).priceList.findMany({
        where: {
            tenantId,
            isActive: true,
            currency,
        },
        include: {
            items: {
                where: { productId },
            },
        },
        orderBy: { createdAt: 'desc' }, // Newer lists take precedence if tied
    });

    // 1. Branch specific priority
    if (branchId) {
        const branchList = activeLists.find((l: any) => l.branchId === branchId && l.items.length > 0);
        if (branchList) {
            const item = branchList.items[0];
            return {
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent ?? 0,
                source: 'BRANCH_PRICE_LIST',
                priceListId: branchList.id,
            };
        }
    }

    // 2. Default/Global price list (no branch specific)
    const globalList = activeLists.find((l: any) => !l.branchId && l.items.length > 0);
    if (globalList) {
        const item = globalList.items[0];
        return {
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent ?? 0,
            source: 'GLOBAL_PRICE_LIST',
            priceListId: globalList.id,
        };
    }

    // 3. Fallback to product base price
    // Usually this would query the `Product` table, but our minimal fallback simply returns the incoming price.
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { salePrice: true },
    }).catch(() => null);

    if (product && product.salePrice != null) {
        return {
            unitPrice: product.salePrice,
            discountPercent: 0,
            source: 'PRODUCT_BASE',
            priceListId: null,
        };
    }

    return {
        unitPrice: fallbackPrice,
        discountPercent: 0,
        source: 'MANUAL_FALLBACK',
        priceListId: null,
    };
}

/**
 * Resolves the applicable tax profile for a transaction.
 * Precedence:
 * 1. Branch specific default
 * 2. Tenant global default
 */
export async function resolveTaxProfile(params: {
    tenantId: string;
    branchId?: string | null;
    customerRegion?: string | null;
}) {
    const { tenantId, branchId, customerRegion } = params;

    const profiles = await (prisma as any).taxProfile.findMany({
        where: { tenantId },
    });

    if (!profiles.length) {
        return { taxPercent: 0, source: 'NO_PROFILE', taxProfileId: null };
    }

    // 1. Exact region match
    if (customerRegion) {
        const regionMatch = profiles.find((p: any) => p.taxRegion === customerRegion);
        if (regionMatch) {
            return { taxPercent: regionMatch.rate, source: 'REGION_MATCH', taxProfileId: regionMatch.id };
        }
    }

    // 2. Branch specific default
    if (branchId) {
        const branchMatch = profiles.find((p: any) => p.branchId === branchId && p.isDefault);
        if (branchMatch) {
            return { taxPercent: branchMatch.rate, source: 'BRANCH_DEFAULT', taxProfileId: branchMatch.id };
        }
    }

    // 3. Tenant global default
    const globalDefault = profiles.find((p: any) => !p.branchId && p.isDefault);
    if (globalDefault) {
        return { taxPercent: globalDefault.rate, source: 'GLOBAL_DEFAULT', taxProfileId: globalDefault.id };
    }

    // 4. Any profile as fallback (rare edge case if isDefault isn't set)
    const first = profiles[0];
    return { taxPercent: first.rate, source: 'FALLBACK', taxProfileId: first.id };
}
