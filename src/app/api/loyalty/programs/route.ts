import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const client = prisma as any;

    const programs = await client.loyaltyProgram.findMany({
      where: { tenantId },
      include: {
        tiers: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(programs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, description, pointsPerDollar, redeemRate, tiers } = body;

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const client = prisma as any;

    const program = await client.loyaltyProgram.create({
      data: {
        tenantId,
        name,
        description,
        pointsPerDollar: pointsPerDollar || 1,
        redeemRate: redeemRate || 0.01,
        isActive: true,
        ...(tiers && {
          tiers: {
            create: tiers,
          },
        }),
      },
      include: { tiers: true },
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

