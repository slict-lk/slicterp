import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const surveys = await prisma.survey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { responses: true }
        }
      }
    });

    return NextResponse.json(surveys);
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const survey = await prisma.survey.create({
      data: {
        title: data.title,
        description: data.description,
        questions: data.questions || [],
        status: data.status ?? 'DRAFT',
        startDate: data.startDate,
        endDate: data.endDate,
        tenantId,
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error: any) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

