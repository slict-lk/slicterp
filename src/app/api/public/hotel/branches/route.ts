import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public/hotel/branches
 * Returns active branches for a tenant (public endpoint for frontend)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subdomain = searchParams.get('subdomain');

        if (!subdomain) {
            return NextResponse.json(
                { error: 'Subdomain parameter is required' },
                { status: 400 }
            );
        }

        // Find tenant by subdomain
        const tenant = await prisma.tenant.findFirst({
            where: {
                subdomain: {
                    equals: subdomain,
                    mode: 'insensitive',
                },
            },
        });

        if (!tenant) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }

        // Get active branches for this tenant
        const branches = await prisma.hotelBranch.findMany({
            where: {
                tenantId: tenant.id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                code: true,
                country: true,
                city: true,
                currency: true,
                timezone: true,
                isDefault: true,
                _count: {
                    select: {
                        rooms: true,
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
        console.error('Error fetching public branches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branches' },
            { status: 500 }
        );
    }
}
