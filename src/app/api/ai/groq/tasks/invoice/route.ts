/**
 * POST /api/ai/groq/tasks/invoice
 * Generate invoice from natural language
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { generateInvoice } from '@/lib/ai/erp-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
      );
    }

    const tenantId = (session.user as any).tenantId;
    const result = await generateInvoice(description, tenantId);

    return NextResponse.json({
      success: true,
      invoice: result.invoiceData,
      explanation: result.explanation,
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
