import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { PeriodStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'view' });

        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get('status') as PeriodStatus | null;
        const validStatuses = ['OPEN', 'CLOSED'];
        if (statusParam && !validStatuses.includes(statusParam)) {
            return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400 });
        }

        const yearParam = searchParams.get('year');
        let parsedYear = undefined;
        if (yearParam) {
            parsedYear = parseInt(yearParam, 10);
            if (isNaN(parsedYear)) {
                return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
            }
        }

        const periods = await prisma.accountingPeriod.findMany({
            where: {
                tenantId,
                ...(statusParam && { status: statusParam }),
                ...(parsedYear && { year: parsedYear }),
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' },
            ],
        });

        return NextResponse.json(periods);
    } catch (error: any) {
        if (error.message === 'Forbidden: Insufficient Permissions') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('Error fetching periods:', error);
        return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'create' });
        const body = await request.json();

        if (!body.year || !body.month || !body.startDate || !body.endDate) {
            return NextResponse.json({ error: 'Missing required period fields' }, { status: 400 });
        }
        if (typeof body.year !== 'number' || typeof body.month !== 'number') {
            return NextResponse.json({ error: 'Year and month must be numbers' }, { status: 400 });
        }
        if (!Number.isInteger(body.month) || body.month < 1 || body.month > 12) {
            return NextResponse.json({ error: 'Month must be an integer between 1 and 12' }, { status: 400 });
        }

        // Check if period already exists for this year/month
        const existing = await prisma.accountingPeriod.findUnique({
            where: {
                tenantId_year_month: {
                    tenantId,
                    year: body.year,
                    month: body.month,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'An accounting period already exists for this year and month.' },
                { status: 400 }
            );
        }

        const parsedStartDate = new Date(body.startDate);
        const parsedEndDate = new Date(body.endDate);
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return NextResponse.json({ error: 'startDate and endDate must be valid dates' }, { status: 400 });
        }
        if (parsedStartDate > parsedEndDate) {
            return NextResponse.json({ error: 'startDate must be before or equal to endDate' }, { status: 400 });
        }

        const period = await prisma.accountingPeriod.create({
            data: {
                tenantId,
                name: body.name || `${body.year}-${String(body.month).padStart(2, '0')}`,
                year: body.year,
                month: body.month,
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                status: 'OPEN',
            },
        });

        return NextResponse.json(period, { status: 201 });
    } catch (error: any) {
        if (error.message === 'Forbidden: Insufficient Permissions') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('Error creating period:', error);
        return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
    }
}
