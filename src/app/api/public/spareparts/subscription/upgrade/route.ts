import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCustomerToken } from '@/lib/spareparts-jwt';


async function getCustomer(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = verifyCustomerToken(token);
        return decoded;
    } catch (error) {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const customer = await getCustomer(req);
    if (!customer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { planId } = await req.json();

        let newTier = 'Standard';
        if (planId === 'gold') newTier = 'Gold';
        if (planId === 'platinum') newTier = 'Platinum';

        // Update customer tier
        const updatedCustomer = await prisma.shopCustomer.update({
            where: { id: customer.id },
            data: { tier: newTier },
            select: { id: true, name: true, tier: true }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully upgraded to ${newTier}!`,
            customer: updatedCustomer
        });
    } catch (error) {
        console.error('Upgrade error:', error);
        return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 });
    }
}
