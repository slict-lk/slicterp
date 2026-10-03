import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPublicApiAuthorized } from '@/lib/public-api-auth';

export const dynamic = 'force-dynamic';

// GET /api/public/export/favorites?customerId=...&tenantId=...
export async function GET(request: NextRequest) {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization');
    if (!isPublicApiAuthorized(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    let tenantId = searchParams.get('tenantId');
    const subdomain = searchParams.get('subdomain');

    if (!customerId) {
        return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    if (!tenantId && !subdomain) {
        return NextResponse.json({ error: 'Tenant ID or Subdomain required' }, { status: 400 });
    }

    try {
        // Resolve subdomain to tenantId if needed
        if (!tenantId && subdomain) {
            const normalizedDomain = subdomain.replace(/^www\./, '');
            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { subdomain: subdomain },
                        { domain: subdomain },
                        { domain: normalizedDomain }
                    ]
                },
                select: { id: true }
            });

            if (!tenant) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
            }
            tenantId = tenant.id;
        }

        const favorites = await prisma.exportFavorite.findMany({
            where: { customerId, tenantId: tenantId! },
            include: {
                vehicle: {
                    include: {
                        photos: {
                            where: { isPublic: true },
                            take: 1
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            data: favorites.map(f => ({
                id: f.vehicle.id,
                title: `${f.vehicle.year} ${f.vehicle.make} ${f.vehicle.model}`,
                stockNumber: f.vehicle.stockNumber,
                price: Number(f.vehicle.fobPrice) > 0 ? f.vehicle.fobPrice : f.vehicle.purchasePrice,
                currency: f.vehicle.currency,
                mileage: f.vehicle.mileage,
                mainPhoto: f.vehicle.photos[0]?.url
                    ? (f.vehicle.photos[0].url.startsWith('http')
                        ? f.vehicle.photos[0].url
                        : `${process.env.NEXTAUTH_URL || 'https://erp.slict.lk'}${f.vehicle.photos[0].url}`)
                    : null,
                status: f.vehicle.status
            }))
        });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/public/export/favorites
export async function POST(request: NextRequest) {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization');
    if (!isPublicApiAuthorized(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { customerId, vehicleId, tenantId, action } = body;

        if (!customerId || !vehicleId || !tenantId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (action === 'remove') {
            await prisma.exportFavorite.deleteMany({
                where: { customerId, vehicleId, tenantId }
            });
            return NextResponse.json({ success: true, message: 'Removed from favorites' });
        } else {
            // Add (using upsert logic manually since we have a compound unique constraint)
            const favorite = await prisma.exportFavorite.upsert({
                where: {
                    customerId_vehicleId: { customerId, vehicleId }
                },
                update: {
                    tenantId // Ensure tenantId matches
                },
                create: {
                    customerId,
                    vehicleId,
                    tenantId
                }
            });
            return NextResponse.json({ success: true, favorite });
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
