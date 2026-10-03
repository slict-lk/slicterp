import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Get all charges for an admission
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: admissionId } = await params;
        const tenant = await getOrCreateDefaultTenant();

        const charges = await prisma.admissionCharge.findMany({
            where: { admissionId, tenantId: tenant.id },
            orderBy: { chargeDate: 'desc' },
        });

        return NextResponse.json({ charges });
    } catch (error) {
        console.error('Error fetching charges:', error);
        return NextResponse.json(
            { error: 'Failed to fetch charges' },
            { status: 500 }
        );
    }
}

// Add a new charge to admission
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: admissionId } = await params;
        const tenant = await getOrCreateDefaultTenant();
        const data = await request.json();

        // Create the charge
        const charge = await prisma.admissionCharge.create({
            data: {
                admissionId,
                chargeType: data.chargeType,
                description: data.description,
                quantity: data.quantity || 1,
                unitPrice: data.unitPrice,
                totalAmount: (data.quantity || 1) * data.unitPrice,
                labOrderId: data.labOrderId,
                productId: data.productId,
                tenantId: tenant.id,
            },
        });

        // Update admission running total
        const allCharges = await prisma.admissionCharge.findMany({
            where: { admissionId },
        });

        const totalCharges = allCharges.reduce((sum, c) => sum + c.totalAmount, 0);

        await prisma.admission.update({
            where: { id: admissionId },
            data: { totalCharges },
        });

        return NextResponse.json(charge, { status: 201 });
    } catch (error) {
        console.error('Error creating charge:', error);
        return NextResponse.json(
            { error: 'Failed to create charge' },
            { status: 500 }
        );
    }
}
