import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/hotel/branches/[id]
 * Get a single branch by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = (session.user as any)?.tenantId;
        const { id } = await params;

        const branch = await prisma.hotelBranch.findFirst({
            where: { id, tenantId },
            include: {
                config: true,
                _count: {
                    select: {
                        rooms: true,
                        bookings: true,
                    }
                }
            }
        });

        if (!branch) {
            return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        }

        return NextResponse.json(branch);
    } catch (error: any) {
        console.error('Error fetching branch:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branch' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/hotel/branches/[id]
 * Update a branch
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = (session.user as any)?.tenantId;
        const { id } = await params;
        const body = await request.json();

        // Verify branch belongs to tenant
        const existing = await prisma.hotelBranch.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        }

        // If setting as default, unset other defaults
        if (body.isDefault && !existing.isDefault) {
            await prisma.hotelBranch.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const branch = await prisma.hotelBranch.update({
            where: { id },
            data: {
                name: body.name,
                code: body.code?.toUpperCase(),
                country: body.country,
                city: body.city,
                address: body.address,
                timezone: body.timezone,
                currency: body.currency,
                phone: body.phone,
                email: body.email,
                isDefault: body.isDefault,
                isActive: body.isActive,
            }
        });

        return NextResponse.json(branch);
    } catch (error: any) {
        console.error('Error updating branch:', error);
        return NextResponse.json(
            { error: 'Failed to update branch' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/hotel/branches/[id]
 * Delete a branch
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = (session.user as any)?.tenantId;
        const { id } = await params;

        // Verify branch belongs to tenant
        const existing = await prisma.hotelBranch.findFirst({
            where: { id, tenantId },
            include: { _count: { select: { rooms: true } } }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        }

        // Prevent deletion if branch has rooms
        if (existing._count.rooms > 0) {
            return NextResponse.json(
                { error: 'Cannot delete branch with existing rooms. Move or delete rooms first.' },
                { status: 400 }
            );
        }

        await prisma.hotelBranch.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting branch:', error);
        return NextResponse.json(
            { error: 'Failed to delete branch' },
            { status: 500 }
        );
    }
}
