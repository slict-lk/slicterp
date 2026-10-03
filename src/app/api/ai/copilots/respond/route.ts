import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getTenantAIConfig, logControlPlaneEvent } from '@/lib/ai/control-plane';
import { processUserMessage } from '@/lib/ai/chat-agent';
import { prisma } from '@/lib/prisma';
import { getIntelligenceAIContext } from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

const MODULE_TITLES: Record<string, string> = {
  crm: 'CRM',
  accounting: 'Accounting',
  spareparts: 'Spare Parts',
  'real-estate': 'Real Estate',
  restaurant: 'Restaurant',
  'vehicle-export': 'Vehicle Export',
  studio: 'Studio',
  intelligence: 'Organizational Intelligence',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !(session.user as any).tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId as string;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const module = String(body.module || '');
    const message = String(body.message || '').trim();
    const context = body.context && typeof body.context === 'object' && !Array.isArray(body.context) ? body.context : {};

    if (!module || !message) {
      return NextResponse.json({ error: 'Module and message are required' }, { status: 400 });
    }

    const config = await getTenantAIConfig(tenantId);
    const copilot = config.copilots.find((item) => item.module === module && item.enabled);

    if (!copilot && module !== 'intelligence') {
      return NextResponse.json({ error: 'No enabled copilot for this module' }, { status: 404 });
    }

    const intelligenceContext =
      module === 'intelligence' ? await getIntelligenceAIContext(prisma, tenantId) : null;

    const effectiveCopilot =
      copilot ??
      (module === 'intelligence'
        ? {
            id: 'intelligence-copilot',
            label: 'Organizational Intelligence',
            allowedIntents: ['summaries', 'explanations', 'recommendation drafting', 'executive briefing'],
            dataSources: ['readiness', 'workforce', 'constraints', 'toc', 'recommendations'],
            responseMode: 'grounded-summary',
            welcomeMessage:
              'Answer only from organizational intelligence context. Never invent scores, promotions, or unaudited decisions.',
          }
        : null);

    const safeContext =
      module === 'intelligence'
        ? {
            ...(context || {}),
            intelligence: intelligenceContext,
          }
        : context;

    const prompt = [
      `You are the ${effectiveCopilot?.label || MODULE_TITLES[module] || module} copilot inside a multi-tenant ERP.`,
      `Module: ${MODULE_TITLES[module] || module}`,
      `Allowed intents: ${effectiveCopilot?.allowedIntents.join(', ') || 'general assistance'}`,
      `Data sources: ${effectiveCopilot?.dataSources.join(', ') || 'page context only'}`,
      `Response mode: ${effectiveCopilot?.responseMode || 'grounded-summary'}`,
      effectiveCopilot?.welcomeMessage ? `Operator guidance: ${effectiveCopilot.welcomeMessage}` : null,
      'Use only the provided context and tenant-safe ERP knowledge.',
      module === 'intelligence'
        ? 'Important: do not answer from generic ERP knowledge. Only use the intelligence context below.'
        : null,
      `Current page context: ${JSON.stringify(safeContext)}`,
      `User request: ${message}`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await processUserMessage(prompt, [], tenantId, session.user.id, 2);

    await logControlPlaneEvent({
      tenantId,
      integration: 'ai-copilot',
      action: `${module}.respond`,
      status: 'SUCCESS',
      requestData: {
        module,
        copilotId: effectiveCopilot?.id || module,
        messageLength: message.length,
      },
      responseData: {
        functionCalls: result.functionCalls || [],
      },
    });

    return NextResponse.json({
      module,
      copilotId: effectiveCopilot?.id || module,
      response: result.response,
      functionCalls: result.functionCalls || [],
    });
  } catch (error: any) {
    console.error('Error running module copilot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
