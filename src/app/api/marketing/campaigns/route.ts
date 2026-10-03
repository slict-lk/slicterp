import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';

    const campaigns = await prisma.emailCampaign.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const stats = await prisma.emailCampaign.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    return NextResponse.json({
      campaigns,
      stats: stats.reduce((acc: any, s: any) => ({ ...acc, [s.status]: s._count }), {}),
    });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const campaign = await prisma.emailCampaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        content: data.content,
        htmlContent: data.htmlContent,
        status: data.status || 'DRAFT',
        scheduledAt: data.scheduledAt,
        tenantId,
        recipients: {
          create: data.recipients?.map((r: any) => ({
            email: r.email,
            name: r.name,
            tenantId,
          })) || [],
        },
      },
      include: {
        recipients: true,
        _count: {
          select: { recipients: true },
        },
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

