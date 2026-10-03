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

        const survey = await prisma.survey.findFirst({
            where: { id, tenantId },
        });

        if (!survey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(survey);
    } catch (error: any) {
        console.error('Error fetching survey:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await req.json();

        const survey = await prisma.survey.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                status: data.status ?? (data.isActive !== undefined ? (data.isActive ? 'ACTIVE' : 'DRAFT') : undefined),
                questions: data.questions,
            },
        });

        return NextResponse.json(survey);
    } catch (error: any) {
        console.error('Error updating survey:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.survey.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Survey deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting survey:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

