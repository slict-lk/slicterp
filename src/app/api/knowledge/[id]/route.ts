import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id } = await params;

    const article = await prisma.knowledgeArticle.findFirst({
      where: { id, tenantId },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json(article);
  } catch (error: any) {
    console.error('Error fetching knowledge article:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id } = await params;
    const data = await req.json();

    const article = await prisma.knowledgeArticle.update({
      where: { id },
      data,
    });

    return NextResponse.json(article);
  } catch (error: any) {
    console.error('Error updating knowledge article:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.knowledgeArticle.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting knowledge article:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
