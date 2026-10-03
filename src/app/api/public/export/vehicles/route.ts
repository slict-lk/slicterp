
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPublicApiAuthorized } from '@/lib/public-api-auth';

export const dynamic = 'force-dynamic';

// GET /api/public/export/vehicles
export async function GET(request: NextRequest) {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization');
    if (!isPublicApiAuthorized(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');
    const subdomain = searchParams.get('subdomain');
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const minYear = searchParams.get('minYear');
    const maxYear = searchParams.get('maxYear');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const bodyType = searchParams.get('bodyType');
    const transmission = searchParams.get('transmission');
    const fuelType = searchParams.get('fuelType');
    const steering = searchParams.get('steering');
    const color = searchParams.get('color');
    const minEngineCc = searchParams.get('minEngineCc');
    const maxEngineCc = searchParams.get('maxEngineCc');
    const sort = searchParams.get('sort');

    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const ids = searchParams.get('ids')?.split(',');

    if (!tenantId && !subdomain) {
        return NextResponse.json({ error: 'Tenant ID or Subdomain required' }, { status: 400 });
    }

    try {
        // If subdomain is provided, resolve it to tenantId
        // If subdomain is provided, resolve it to tenantId
        if (!tenantId && subdomain) {
            const normalizedDomain = subdomain.replace(/^www\./, '');

            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { subdomain: subdomain },
                        { domain: subdomain },
                        { domain: normalizedDomain } // Check normalized domain
                    ]
                },
                select: { id: true }
            });

            if (!tenant) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
            }
            tenantId = tenant.id;
        }

        const where: any = {
            tenantId,
            isPublished: true, // IMPORTANT: Only published vehicles
            // Filter by status if needed? Usually we show all published ones (IN_YARD, etc.)
            // But maybe not SOLD/DELIVERED?
            // Let's assume isPublished handles the "Visible" logic. 
        };

        if (make) where.make = { contains: make, mode: 'insensitive' };
        if (model) where.model = { contains: model, mode: 'insensitive' };
        if (minYear) where.year = { gte: parseInt(minYear) };
        if (maxYear) where.year = { lte: parseInt(maxYear) };
        if (minPrice) where.fobPrice = { ...where.fobPrice, gte: parseFloat(minPrice) };
        if (maxPrice) where.fobPrice = { ...where.fobPrice, lte: parseFloat(maxPrice) };
        if (bodyType) where.bodyType = bodyType;
        if (transmission) where.transmission = transmission;
        if (fuelType) where.fuelType = fuelType;
        if (steering) where.steering = steering;
        if (color) where.color = { contains: color, mode: 'insensitive' };
        if (minEngineCc) where.engineCc = { ...where.engineCc, gte: parseInt(minEngineCc) };
        if (maxEngineCc) where.engineCc = { ...where.engineCc, lte: parseInt(maxEngineCc) };
        if (ids && ids.length > 0) where.id = { in: ids };

        // Sorting
        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'price_asc') orderBy = { fobPrice: 'asc' };
        else if (sort === 'price_desc') orderBy = { fobPrice: 'desc' };
        else if (sort === 'year_desc') orderBy = { year: 'desc' };
        else if (sort === 'mileage_asc') orderBy = { mileage: 'asc' };

        const [vehicles, total] = await Promise.all([
            prisma.exportVehicle.findMany({
                where,
                take: parseInt(limit),
                skip: parseInt(offset),
                orderBy,
                include: {
                    photos: {
                        where: { isPublic: true },
                        take: 1, // Main photo
                    },
                },
            }),
            prisma.exportVehicle.count({ where }),
        ]);

        return NextResponse.json({
            data: vehicles.map(v => ({
                id: v.id,
                title: `${v.year} ${v.make} ${v.model}`,
                stockNumber: v.stockNumber,
                price: Number(v.fobPrice) > 0 ? v.fobPrice : v.purchasePrice, // Fallback to purchasePrice if FOB is 0 (seed data)
                currency: v.currency,
                mileage: v.mileage,
                fuel: v.fuelType,
                transmission: v.transmission,
                mainPhoto: v.photos[0]?.url
                    ? (v.photos[0].url.startsWith('http')
                        ? v.photos[0].url
                        : `${process.env.NEXTAUTH_URL || 'https://erp.slict.lk'}${v.photos[0].url}`)
                    : null,
                status: v.status,
            })),
            meta: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
            }
        });
    } catch (error) {
        console.error('Error fetching public vehicles:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
