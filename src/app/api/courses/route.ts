import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// GET /api/courses - List courses
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const published = searchParams.get('published');
    const level = searchParams.get('level');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const courses = await prisma.course.findMany({
      where: {
        tenantId,
        ...(published === 'true' && { isPublished: true }),
        ...(level && { level: level as any }),
      },
      include: {
        lessons: {
          select: { id: true, title: true, duration: true, order: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/courses - Create course
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, title, slug, description, coverImage, isFree, price, level, duration, language } = body;

    if (!tenantId || !title) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        tenantId,
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        description,
        coverImage,
        isFree: isFree ?? true,
        price,
        level: level || 'BEGINNER',
        duration,
        language: language || 'en',
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
