import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/spareparts/products - Get all spare parts
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const limit = searchParams.get('limit');

        const where: any = {
            tenantId: user.tenantId,
            isActive: true,
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { partNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (category) {
            where.category = category;
        }

        const products = await (prisma as any).sparePart.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit ? parseInt(limit) : undefined,
            include: {
                aliases: true,
                taxCategory: true,
            }
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Error fetching spare parts:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

// POST /api/spareparts/products - Create new spare part
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const product = await (prisma as any).sparePart.create({
            data: {
                tenantId: user.tenantId,
                sku: body.sku,
                name: body.name,
                description: body.description,
                category: body.category,
                brand: body.brand,
                salePrice: body.salePrice || 0,
                costPrice: body.costPrice || 0,
                stockQty: body.stockQty || 0,
                minStockQty: body.minStockQty || 0,
                partNumber: body.partNumber,
                compatibleModels: body.compatibleModels || [],
                condition: body.condition || 'NEW',
                images: body.images || [],
                isActive: true,
                taxCategoryId: body.taxCategoryId,
                aliases: body.aliases ? {
                    create: body.aliases.map((alias: any) => ({
                        aliasNumber: alias.aliasNumber,
                        brand: alias.brand
                    }))
                } : undefined,
            },
        });

        return NextResponse.json({ product }, { status: 201 });
    } catch (error) {
        console.error('Error creating spare part:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
