import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { ollamaGenerate } from '@/lib/ollama';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Proxy endpoint to call Ollama generate from the server.
 * Accepts { model, prompt, stream?, ... } in the POST body.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { model, prompt, stream, ...rest } = body || {};

    if (!model || !prompt) {
      return NextResponse.json({ error: 'Missing model or prompt' }, { status: 400 });
    }

    // Use tenant from session if available (server authoritative)
    const sessionTenantId = (session as any)?.user?.tenantId;
    const opts = {
      model,
      prompt,
      stream: stream ?? false,
      tenantId: sessionTenantId,
      ...rest,
    };

    const result = await ollamaGenerate(opts, 60000);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Ollama generate error:', err);
    return NextResponse.json({ error: err?.message || 'Ollama error' }, { status: 500 });
  }
}
