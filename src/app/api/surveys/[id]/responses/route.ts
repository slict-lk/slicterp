import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
        const { id: surveyId } = await params;
        const data = await req.json();

        // For the simple Survey model, we'll just return a success message
        // In a full implementation, you'd store responses in a separate table

        // Verify survey exists
        const survey = await prisma.survey.findFirst({
            where: { id: surveyId, tenantId },
        });

        if (!survey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Store response (simplified - just return success for now)
        const response = {
            id: `resp-${Date.now()}`,
            surveyId,
            respondentName: data.respondentName,
            respondentEmail: data.respondentEmail,
            answers: data.answers,
            submittedAt: new Date(),
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error: any) {
        console.error('Error submitting survey response:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
        const { id: surveyId } = await params;

        // Verify survey exists
        const survey = await prisma.survey.findFirst({
            where: { id: surveyId, tenantId },
        });

        if (!survey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Return empty responses for now
        // In full implementation, fetch from responses table
        return NextResponse.json([]);
    } catch (error: any) {
        console.error('Error fetching survey responses:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
