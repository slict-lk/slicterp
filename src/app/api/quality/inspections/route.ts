import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const inspectionType = searchParams.get('inspectionType');

        const where: any = { tenantId };
        if (status) where.status = status;
        if (inspectionType) where.inspectionType = inspectionType;

        const inspections = await prisma.qualityInspection.findMany({
            where,
            orderBy: { inspectionDate: 'desc' },
            take: 100,
        });

        // Get statistics
        const stats = await prisma.qualityInspection.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: true,
        });

        return NextResponse.json({
            inspections,
            stats: stats.reduce((acc: any, s: any) => ({ ...acc, [s.status]: s._count }), {}),
        });
    } catch (error: any) {
        console.error('Error fetching quality inspections:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
        const data = await req.json();

        const inspection = await prisma.qualityInspection.create({
            data: {
                ...data,
                tenantId,
            },
        });

        return NextResponse.json(inspection, { status: 201 });
    } catch (error: any) {
        console.error('Error creating quality inspection:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
