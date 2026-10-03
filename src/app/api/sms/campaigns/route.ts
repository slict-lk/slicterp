import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// GET /api/sms/campaigns - List SMS campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const campaigns = await prisma.sMSCampaign.findMany({
      where: {
        tenantId,
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/sms/campaigns - Create SMS campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, message, scheduledAt } = body;

    if (!tenantId || !name || !message) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    if (message.length > 160) {
      return NextResponse.json({ error: 'Message exceeds 160 characters' }, { status: 400 });
    }

    const campaign = await prisma.sMSCampaign.create({
      data: {
        tenantId,
        name,
        message,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: 'DRAFT',
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
