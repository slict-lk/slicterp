
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/vehicle-export/yard-jobs/[id]/materials
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: jobId } = await params;
        const body = await request.json();
        const { partName, quantity, unitCost } = body;

        const totalCost = parseFloat(unitCost) * parseInt(quantity);

        const material = await (prisma as any).yardMaterial.create({
            data: {
                yardJobId: jobId,
                tenantId: user.tenantId,
                partName,
                quantity: parseInt(quantity),
                unitCost: parseFloat(unitCost),
                totalCost,
            },
        });


        return NextResponse.json(material);
    } catch (error) {
        console.error('Error adding yard material:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
