import { NextRequest, NextResponse } from 'next/server';
import { getQuantityPromotionById, updateQuantityPromotion } from '@/apps/spareparts/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

// GET /api/spareparts/promotions/[id] - Get single promotion
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

        const promotion = await getQuantityPromotionById(id, user.tenantId);

        if (!promotion) {
            return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
        }

        return NextResponse.json(promotion);
    } catch (error) {
        console.error('Error fetching promotion:', error);
        return NextResponse.json(
            { error: 'Failed to fetch promotion' },
            { status: 500 }
        );
    }
}

// PATCH /api/spareparts/promotions/[id] - Update promotion
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

        // Process dates if present
        const payload = {
            ...body,
            startDate: body.startDate ? new Date(body.startDate) : undefined,
            endDate: body.endDate ? new Date(body.endDate) : undefined,
            minimumPurchase: body.minimumPurchase ? parseFloat(body.minimumPurchase) : undefined,
            maximumDiscount: body.maximumDiscount ? parseFloat(body.maximumDiscount) : undefined,
            discountValue: body.discountValue ? parseFloat(body.discountValue) : undefined,
            targetProducts: body.targetProducts || undefined,
            targetCategories: body.targetCategories || undefined,
        };

        const promotion = await updateQuantityPromotion(id, user.tenantId, payload);

        return NextResponse.json(promotion);
    } catch (error) {
        console.error('Error updating promotion:', error);
        return NextResponse.json(
            { error: 'Failed to update promotion' },
            { status: 500 }
        );
    }
}

// DELETE /api/spareparts/promotions/[id] - Delete promotion
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

        // Verify ownership
        const existing = await getQuantityPromotionById(id, user.tenantId);
        if (!existing) {
            return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
        }

        // Delete (associated tiers should ideally be cascade deleted or manually deleted first)
        // Check schema for cascade. Assuming manual clean up or cascade.
        // For safety, let's manual delete tiers first if standard delete doesn't cascade in Prisma without relation attribute.
        // Actually api.ts uses `(prisma as any)` so I can't check schema easily here but usually relation allows cascade.
        // Let's safe delete tiers then promo.

        await (prisma as any).sparePromotionTier.deleteMany({
            where: { promotionId: id }
        });

        await (prisma as any).sparePromotion.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting promotion:', error);
        return NextResponse.json(
            { error: 'Failed to delete promotion' },
            { status: 500 }
        );
    }
}
