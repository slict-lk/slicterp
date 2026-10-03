import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';

    const client = prisma as any;

    const posts = await client.blogPost.findMany({
      where: { tenantId },
      include: {
        author: { select: { name: true, email: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    const publishedCount = await client.blogPost.count({
      where: { tenantId, isPublished: true },
    });

    return NextResponse.json({
      posts,
      publishedCount,
      totalCount: posts.length,
    });
  } catch (error: any) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const client = prisma as any;

    const post = await client.blogPost.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        author: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

