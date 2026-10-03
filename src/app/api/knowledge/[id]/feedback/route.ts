import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
        const { id } = await params;
        const { helpful } = await req.json();

        // Update helpful/not helpful count
        const article = await prisma.knowledgeArticle.update({
            where: { id },
            data: helpful
                ? { helpfulCount: { increment: 1 } }
                : { notHelpfulCount: { increment: 1 } },
        });

        return NextResponse.json({ message: 'Feedback recorded', article });
    } catch (error: any) {
        console.error('Error recording feedback:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
