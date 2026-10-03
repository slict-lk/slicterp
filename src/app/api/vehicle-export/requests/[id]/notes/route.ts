
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getCurrentUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content required' }, { status: 400 });
        }

        const note = await prisma.requestNote.create({
            data: {
                content,
                requestId: id,
                authorId: session.id
            }
        });

        return NextResponse.json({ success: true, data: note });

    } catch (error) {
        console.error('Failed to add note:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
