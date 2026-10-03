import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { TaxType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        const taxRates = await prisma.taxRate.findMany({
            where: {
                tenantId: tenant.id,
                isActive: true, // Only fetch active by default unless specified otherwise
            },
            orderBy: [
                { sequenceOrder: 'asc' },
                { code: 'asc' }
            ]
        });

        return NextResponse.json(taxRates);
    } catch (error) {
        console.error('Error fetching tax rates:', error);
        return NextResponse.json({ error: 'Failed to fetch tax rates' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const body = await request.json();

        if (!body.code || !body.name || body.rate === undefined || !body.liabilityAccountId) {
            return NextResponse.json({ error: 'Code, name, rate, and liabilityAccountId are required' }, { status: 400 });
        }
        const parsedRate = Number(body.rate);
        if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
            return NextResponse.json({ error: 'Rate must be a finite number between 0 and 100' }, { status: 400 });
        }

        const validTaxTypes = ['STANDARD', 'COMPOUND', 'FLAT'];
        if (body.type && !validTaxTypes.includes(body.type)) {
            return NextResponse.json({ error: 'Invalid tax type' }, { status: 400 });
        }

        // Verify liability account exists
        const account = await prisma.account.findFirst({
            where: {
                id: body.liabilityAccountId,
                tenantId: tenant.id
            }
        });

        if (!account) {
            return NextResponse.json({ error: 'Liability account not found' }, { status: 404 });
        }

        const taxRate = await prisma.taxRate.create({
            data: {
                tenantId: tenant.id,
                code: body.code,
                name: body.name,
                rate: parsedRate,
                type: body.type as TaxType || 'STANDARD',
                isCompound: body.isCompound || false,
                sequenceOrder: body.sequenceOrder || 0,
                liabilityAccountId: body.liabilityAccountId,
                isActive: true,
            },
            include: {
                // Just return the bare minimum so we don't accidentally leak sensitive account details
            }
        });

        return NextResponse.json(taxRate, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Tax rate code already exists' }, { status: 400 });
        }
        console.error('Error creating tax rate:', error);
        return NextResponse.json({ error: 'Failed to create tax rate' }, { status: 500 });
    }
}
