import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';

    const pages = await prisma.webPage.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const publishedCount = await prisma.webPage.count({
      where: { tenantId, isPublished: true },
    });

    return NextResponse.json({
      pages,
      publishedCount,
      totalCount: pages.length,
    });
  } catch (error: any) {
    console.error('Error fetching web pages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const page = await prisma.webPage.create({
      data: {
        ...data,
        tenantId,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error: any) {
    console.error('Error creating web page:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
