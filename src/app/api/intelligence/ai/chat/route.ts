import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { chatWithIntelligenceAI } from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const body = await request.json().catch(() => ({}));
    const message = String(body?.message ?? '').trim();
    const focus =
      body?.focus === 'readiness' ||
      body?.focus === 'workforce' ||
      body?.focus === 'constraints' ||
      body?.focus === 'toc' ||
      body?.focus === 'simulator' ||
      body?.focus === 'recommendations' ||
      body?.focus === 'overview'
        ? body.focus
        : 'overview';
    const audience =
      body?.audience === 'HR' || body?.audience === 'OPERATIONS' || body?.audience === 'CEO'
        ? body.audience
        : 'CEO';

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Message is required',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const result = await chatWithIntelligenceAI(prisma, tenant.id, user.id, {
      message,
      focus,
      audience,
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
