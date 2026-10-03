import { NextResponse } from 'next/server';
import { requireAIAccess } from '@/lib/ai/governance';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId } = await requireAIAccess('view');

    const models = await prisma.languageModel.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        provider: true,
        modelId: true,
        isDefault: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(models);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error fetching chat models:', error);
    return NextResponse.json({ error: 'Failed to fetch chat models' }, { status: 500 });
  }
}
