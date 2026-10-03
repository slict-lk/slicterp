
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const categories = await prisma.shopTaxCategory.findMany({
            where: { tenantId: user.tenantId },
            orderBy: { rate: 'desc' }
        });

        return NextResponse.json(categories);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, rate, description, isDefault } = body;

        if (isDefault) {
            // Unset previous default
            await prisma.shopTaxCategory.updateMany({
                where: { tenantId: user.tenantId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const category = await prisma.shopTaxCategory.create({
            data: {
                name,
                rate: Number(rate),
                description,
                isDefault: Boolean(isDefault),
                tenantId: user.tenantId
            }
        });

        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { id, name, rate, description, isDefault } = body;

        if (isDefault) {
            await prisma.shopTaxCategory.updateMany({
                where: { tenantId: user.tenantId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const category = await prisma.shopTaxCategory.update({
            where: { id },
            data: {
                name,
                rate: Number(rate),
                description,
                isDefault: Boolean(isDefault),
            }
        });

        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await prisma.shopTaxCategory.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Cannot delete category in use or not found' }, { status: 500 });
    }
}
