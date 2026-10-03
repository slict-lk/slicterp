import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/hotel/branches
 * Returns all branches for the current tenant
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = (session.user as any)?.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
        }

        const branches = await prisma.hotelBranch.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: {
                        rooms: true,
                        bookings: true,
                    }
                }
            },
            orderBy: [
                { isDefault: 'desc' },
                { name: 'asc' }
            ]
        });

        return NextResponse.json(branches);
    } catch (error: any) {
        console.error('Error fetching branches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branches' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/hotel/branches
 * Create a new branch
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = (session.user as any)?.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
        }

        const body = await request.json();
        const { name, code, country, city, address, timezone, currency, phone, email, isDefault } = body;

        // Validate required fields
        if (!name || !code || !country || !city) {
            return NextResponse.json(
                { error: 'Name, code, country, and city are required' },
                { status: 400 }
            );
        }

        // If this is set as default, unset other defaults
        if (isDefault) {
            await prisma.hotelBranch.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const branch = await prisma.hotelBranch.create({
            data: {
                tenantId,
                name,
                code: code.toUpperCase(),
                country,
                city,
                address,
                timezone: timezone || 'Asia/Colombo',
                currency: currency || 'LKR',
                phone,
                email,
                isDefault: isDefault || false,
            }
        });

        return NextResponse.json(branch, { status: 201 });
    } catch (error: any) {
        console.error('Error creating branch:', error);
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Branch code already exists' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to create branch' },
            { status: 500 }
        );
    }
}
