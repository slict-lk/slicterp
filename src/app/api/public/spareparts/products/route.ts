import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getQuantityPromotions } from '@/apps/spareparts/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/spareparts/products
 * Query Params: subdomain, category, brand, search, page, limit
 */
// Type definition for the response
type ProductWithPromos = any;

/**
 * GET /api/public/spareparts/products
 * Query Params: subdomain, category, brand, search, page, limit
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subdomain = searchParams.get('subdomain');
        const category = searchParams.get('category');
        const brand = searchParams.get('brand');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        if (!subdomain) {
            return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
        }

        console.log('[DEBUG] Public API Products - Subdomain:', subdomain);

        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: { id: true, name: true }
        });

        console.log('[DEBUG] Public API Products - Resolved Tenant:', tenant?.id, tenant?.name);

        if (!tenant) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        // Build where clause
        const where: any = {
            tenantId: tenant.id,
            isActive: true,
        };

        if (category && category !== 'All') {
            where.category = category; // Exact match for now
        }

        if (brand && brand !== 'All') {
            where.brand = brand;
        }

        // Vehicle compatibility filter
        const vehicleMake = searchParams.get('make');
        const vehicleModel = searchParams.get('model');
        const vehicleYear = searchParams.get('year');

        if (vehicleMake || vehicleModel || vehicleYear) {
            // Build vehicle search pattern: "Make Model Year" format
            const vehiclePatterns: string[] = [];
            if (vehicleMake) vehiclePatterns.push(vehicleMake);
            if (vehicleModel) vehiclePatterns.push(vehicleModel);
            if (vehicleYear) vehiclePatterns.push(vehicleYear);

            // Filter products where compatibleModels contains any matching pattern
            where.compatibleModels = {
                hasSome: vehiclePatterns
            };
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { partNumber: { contains: search, mode: 'insensitive' } },
                // Add Alias Search
                {
                    aliases: {
                        some: {
                            aliasNumber: { contains: search, mode: 'insensitive' }
                        }
                    }
                }
            ];
        }

        const sort = searchParams.get('sort') || 'latest';

        // Determine sorting
        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'popular') {
            orderBy = { views: 'desc' };
        } else if (sort === 'bestsellers') {
            orderBy = { totalSales: 'desc' };
        } else if (sort === 'price_asc') {
            orderBy = { salePrice: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { salePrice: 'desc' };
        } else if (sort === 'name_asc') {
            orderBy = { name: 'asc' };
        }

        // Execute query - Include Aliases in response
        const [products, total] = await Promise.all([
            prisma.sparePart.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy,
                include: {
                    aliases: true // Fetch aliases for post-processing
                }
            } as any),
            prisma.sparePart.count({ where })
        ]);

        // Fetch active quantity promotions
        const activePromotions = await getQuantityPromotions(tenant.id, {
            active: true,
            type: 'QUANTITY'
        });

        // Post-processing to find matched alias and attach promotions
        const processedProducts = products.map((product: any) => {
            // Logic to find which alias matched the search term
            let matchedAlias = null;
            if (search && product.aliases && product.aliases.length > 0) {
                const searchLower = search.toLowerCase();
                // Find the best match (exact or partial)
                const found = product.aliases.find((a: any) =>
                    a.aliasNumber.toLowerCase().includes(searchLower)
                );
                if (found) {
                    matchedAlias = found.aliasNumber;
                }
            }

            const applicablePromos = activePromotions.filter((promo: any) => {
                // ... existing promo filter logic
                if (promo.targetScope === 'ALL') return true;
                if (promo.targetScope === 'PRODUCT' && promo.targetProducts.includes(product.id)) return true;
                if (promo.targetScope === 'CATEGORY' && product.category && promo.targetCategories.includes(product.category)) return true;
                return false;
            });

            const tiers = applicablePromos.flatMap((promo: any) =>
                promo.tiers.map((tier: any) => ({
                    promotionName: promo.name,
                    minQuantity: tier.minQuantity,
                    maxQuantity: tier.maxQuantity,
                    discountType: tier.discountType,
                    discountValue: Number(tier.discountValue)
                }))
            ).sort((a: any, b: any) => a.minQuantity - b.minQuantity);


            return {
                ...product,
                matchedAlias, // New field for frontend
                quantityDiscounts: tiers
            };
        });

        return NextResponse.json({
            data: processedProducts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        // ... error handling
        console.error('Error fetching spare parts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch products' },
            { status: 500 }
        );
    }
}
