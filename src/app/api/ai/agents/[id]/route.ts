import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAgentDetail } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

const db = prisma as any;

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('view');
    const { id } = await params;
    const detail = await getAgentDetail(tenantId, id);

    if (!detail) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error fetching agent detail:', error);
    return NextResponse.json({ error: 'Failed to fetch agent detail' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('edit');
    const { id } = await params;
    const body = await request.json();

    // Validate input
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
    }
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== 'string') {
        return NextResponse.json({ error: 'description must be a string or null' }, { status: 400 });
      }
      data.description = body.description;
    }
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.config !== undefined) {
      if (body.config !== null && (typeof body.config !== 'object' || Array.isArray(body.config))) {
        return NextResponse.json({ error: 'config must be a plain object or null' }, { status: 400 });
      }
      data.config = body.config;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    try {
      const updated = await db.aIAgent.update({
        where: { id, tenantId },
        data,
      });
      return NextResponse.json(updated);
    } catch (prismaError: any) {
      if (prismaError?.code === 'P2025') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      throw prismaError;
    }
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

