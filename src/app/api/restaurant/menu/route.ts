import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        // Fetch consumable products as menu items
        const menuItems = await prisma.product.findMany({
            where: {
                tenantId,
                type: 'CONSUMABLE', // Assuming all restaurant items are consumables
                isActive: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ items: menuItems });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch menu items' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const data = await request.json();

        // Extract and validate standard fields
        const { name, category, costPrice, salePrice, description, images } = data;

        if (!name || isNaN(salePrice)) {
            return NextResponse.json({ error: 'Name and a valid sale price are required' }, { status: 400 });
        }

        // We use type 'CONSUMABLE' for restaurant menu items
        const newItem = await prisma.product.create({
            data: {
                tenantId,
                name,
                sku: `MENU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                costPrice: Number(costPrice) || 0,
                salePrice: Number(salePrice),
                type: 'CONSUMABLE',
                category: category || 'General',
                description: description || '',
                images: images || [],
                isActive: true,
                stockQty: 0, // Not generally tracking tight stock for prepared food by default here
            },
        });

        try {
            await publishModuleMutationEvent({
                tenantId,
                module: 'restaurant',
                entity: 'menu-item',
                event: 'created',
                actorId: 'restaurant-menu-api',
                payload: {
                    menuItemId: newItem.id,
                    name: newItem.name,
                    category: newItem.category,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish menu-item created event:', { tenantId, menuItemId: newItem.id, error: publishError });
        }

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error('Error creating menu item:', error);
        return NextResponse.json(
            { error: 'Failed to create menu item' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const data = await request.json();
        const { id, name, category, costPrice, salePrice, description, images } = data;

        if (!id || !name || isNaN(salePrice)) {
            return NextResponse.json({ error: 'ID, Name and a valid sale price are required' }, { status: 400 });
        }

        const updatedItem = await prisma.product.update({
            where: { id, tenantId },
            data: {
                name,
                costPrice: Number(costPrice) || 0,
                salePrice: Number(salePrice),
                category: category || 'General',
                description: description || '',
                images: images || undefined, // undefined prevents overriding with empty if not provided, though we handle this frontend
            },
        });

        try {
            await publishModuleMutationEvent({
                tenantId,
                module: 'restaurant',
                entity: 'menu-item',
                event: 'updated',
                actorId: 'restaurant-menu-api',
                payload: {
                    menuItemId: updatedItem.id,
                    name: updatedItem.name,
                    category: updatedItem.category,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish menu-item updated event:', { tenantId, menuItemId: updatedItem.id, error: publishError });
        }

        return NextResponse.json(updatedItem, { status: 200 });
    } catch (error) {
        console.error('Error updating menu item:', error);
        return NextResponse.json(
            { error: 'Failed to update menu item' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Menu item ID required' }, { status: 400 });
        }

        await prisma.product.delete({
            where: { id, tenantId },
        });

        try {
            await publishModuleMutationEvent({
                tenantId,
                module: 'restaurant',
                entity: 'menu-item',
                event: 'deleted',
                actorId: 'restaurant-menu-api',
                payload: {
                    menuItemId: id,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish menu-item deleted event:', { tenantId, menuItemId: id, error: publishError });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        return NextResponse.json(
            { error: 'Failed to delete menu item' },
            { status: 500 }
        );
    }
}
