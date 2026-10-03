import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const jobs = await prisma.constructionJob.findMany({
      where: {
        tenantId,
        ...(status && { status: status as any }),
      },
      include: {
        _count: {
          select: { subcontracts: true, materials: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, jobNumber, projectName, description, siteAddress, city, state,
            clientName, clientEmail, clientPhone, startDate, estimatedCost } = body;

    if (!tenantId || !jobNumber || !projectName || !estimatedCost) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const job = await prisma.constructionJob.create({
      data: {
        tenantId, jobNumber, projectName, description,
        siteAddress: siteAddress || '', city: city || '', state: state || '',
        clientName: clientName || '', clientEmail, clientPhone,
        startDate: new Date(startDate),
        estimatedCost,
        actualCost: 0,
        status: 'QUEUED',
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
