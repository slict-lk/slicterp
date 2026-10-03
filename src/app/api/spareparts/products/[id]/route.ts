import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

// GET /api/spareparts/products/[id] - Get single product
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const product = await (prisma as any).sparePart.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            },
            include: {
                aliases: true,
                taxCategory: true,
            }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json({ product });
    } catch (error) {
        console.error('Error fetching spare part:', error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

// PATCH /api/spareparts/products/[id] - Update product
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Check if product exists and belongs to tenant
        const existingProduct = await (prisma as any).sparePart.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            }
        });

        if (!existingProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const product = await (prisma as any).sparePart.update({
            where: {
                id,
            },
            data: {
                sku: body.sku,
                name: body.name,
                description: body.description,
                category: body.category,
                brand: body.brand,
                salePrice: body.salePrice,
                costPrice: body.costPrice,
                stockQty: body.stockQty,
                minStockQty: body.minStockQty,
                partNumber: body.partNumber,
                taxCategoryId: body.taxCategoryId,
                compatibleModels: body.compatibleModels,
                condition: body.condition,
                images: body.images,
                isActive: body.isActive,
                aliases: body.aliases ? {
                    deleteMany: {}, // Clear existing aliases
                    create: body.aliases.map((alias: any) => ({
                        aliasNumber: alias.aliasNumber,
                        brand: alias.brand
                    }))
                } : undefined,
            },
        });

        return NextResponse.json({ product });
    } catch (error) {
        console.error('Error updating spare part:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

// DELETE /api/spareparts/products/[id] - Soft delete product
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const existingProduct = await (prisma as any).sparePart.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            }
        });

        if (!existingProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Soft delete
        await (prisma as any).sparePart.update({
            where: {
                id,
            },
            data: {
                isActive: false,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting spare part:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
