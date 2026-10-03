import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/public/export/vehicles/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');
    const subdomain = searchParams.get('subdomain');

    if (!tenantId && !subdomain) {
        return NextResponse.json({ error: 'Tenant ID or Subdomain required' }, { status: 400 });
    }

    try {
        // Resolve subdomain to tenantId if needed
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

        const vehicle = await prisma.exportVehicle.findFirst({
            where: {
                id,
                tenantId: tenantId!,
                isPublished: true,
            },
            include: {
                photos: {
                    where: { isPublic: true },
                    orderBy: { createdAt: 'asc' },
                },
                customer: {
                    select: { name: true, country: true },
                },
            },
        });

        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: vehicle.id,
            stockNumber: vehicle.stockNumber,
            chassisNumber: vehicle.chassisNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            month: vehicle.month,
            title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            color: vehicle.color,
            fuelType: vehicle.fuelType,
            transmission: vehicle.transmission,
            mileage: vehicle.mileage,
            engineCc: vehicle.engineCc,
            steering: vehicle.steering,
            price: Number(vehicle.fobPrice) > 0 ? vehicle.fobPrice : vehicle.purchasePrice,
            currency: vehicle.currency,
            status: vehicle.status,
            location: vehicle.location,
            auctionGrade: vehicle.auctionGrade,
            photos: vehicle.photos.map(p => ({
                url: p.url.startsWith('http')
                    ? p.url
                    : `${process.env.NEXTAUTH_URL || 'https://erp.slict.lk'}${p.url}`,
                tag: p.tag,
            })),
            mainPhoto: vehicle.photos[0]?.url
                ? (vehicle.photos[0].url.startsWith('http')
                    ? vehicle.photos[0].url
                    : `${process.env.NEXTAUTH_URL || 'https://erp.slict.lk'}${vehicle.photos[0].url}`)
                : null,
            // Features could come from a JSON field or be computed
            features: [],
            description: '',
        });
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
