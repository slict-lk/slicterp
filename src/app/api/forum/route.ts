import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// GET /api/forum - List forum topics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const topics = await prisma.forumTopic.findMany({
      where: {
        tenantId,
        ...(category && { category }),
        ...(status && { status: status as any }),
      },
      include: {
        posts: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json(topics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/forum - Create forum topic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, title, slug, description, category, tags, authorName, authorEmail } = body;

    if (!tenantId || !title || !authorName) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const topic = await prisma.forumTopic.create({
      data: {
        tenantId,
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        description,
        category,
        tags: tags || [],
        authorName,
        authorEmail,
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
