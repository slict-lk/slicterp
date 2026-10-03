import { NextRequest, NextResponse } from 'next/server';
import { createAccount, listAccounts } from '@/apps/crm/api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Accept both direct partyId and human-friendly name/email/phone fields
const accountCreateSchema = z.object({
  // Option A: provide an existing partyId
  partyId: z.string().optional(),
  // Option B: create a new party on the fly
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  annualRevenue: z.number().optional(),
  // Account-level fields
  accountCode: z.string().optional(),
  status: z.string().optional(),
  accountType: z.string().optional(),
  customerType: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
}).passthrough();

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { searchParams } = new URL(request.url);
    const data = await listAccounts(tenantId, searchParams.get('search') || undefined);

    return NextResponse.json({
      items: data,
      metadata: { total: data.length, page: 1, limit: 100 }
    });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch accounts' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'create' });
    const body = await request.json();
    const parsed = accountCreateSchema.parse(body);

    let resolvedPartyId = parsed.partyId;

    // If no partyId provided, create a Party record first
    if (!resolvedPartyId) {
      if (!parsed.name?.trim()) {
        return NextResponse.json({ error: 'Either partyId or name is required' }, { status: 400 });
      }
      const party = await (prisma as any).party.create({
        data: {
          tenantId,
          partyType: 'ORGANIZATION',
          displayName: parsed.name.trim(),
          primaryEmail: parsed.email?.trim() || null,
          primaryPhone: parsed.phone?.trim() || null,
        },
      });
      resolvedPartyId = party.id;
    }

    const item = await createAccount(tenantId, {
      ...parsed,
      partyId: resolvedPartyId,
      customerType: parsed.customerType ?? parsed.accountType ?? 'GENERAL',
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create account' }, { status });
  }
}

