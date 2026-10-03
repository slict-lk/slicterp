import { NextRequest, NextResponse } from 'next/server';
import { createContactLink, listContacts } from '@/apps/crm/api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  customerAccountId: z.string().optional(),
});

const createContactSchema = z.object({
  customerAccountId: z.string(),
  contactPartyId: z.string(),
  role: z.string().optional(),
  isPrimary: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { searchParams } = new URL(request.url);

    const validated = listQuerySchema.parse({
      customerAccountId: searchParams.get('customerAccountId') || undefined,
    });

    const result = await listContacts(tenantId, validated);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch contacts' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'create' });
    const body = await request.json();

    const validatedBody = createContactSchema.parse(body);
    const item = await createContactLink(tenantId, validatedBody);

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create contact link' }, { status });
  }
}

