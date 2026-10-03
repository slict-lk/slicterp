import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/server/erp-context';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const salesSettingsSchema = z.object({
  defaults: z.object({
    approval: z.object({
      discountThresholdPercent: z.number().nullable().optional(),
      marginThresholdPercent: z.number().nullable().optional(),
      creditHoldBlocksOrder: z.boolean().optional(),
    }).optional(),
    pricing: z.object({
      defaultCurrency: z.string().optional(),
      taxMode: z.string().optional(),
    }).optional(),
  }).optional(),
}).passthrough();

export async function GET() {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    const existingSettings = (tenant?.settings as any)?.sales || {};

    return NextResponse.json({
      data: {
        tenantId,
        defaults: {
          approval: {
            discountThresholdPercent: existingSettings?.defaults?.approval?.discountThresholdPercent ?? 10,
            marginThresholdPercent: existingSettings?.defaults?.approval?.marginThresholdPercent ?? null,
            creditHoldBlocksOrder: existingSettings?.defaults?.approval?.creditHoldBlocksOrder ?? true,
          },
          pricing: {
            defaultCurrency: existingSettings?.defaults?.pricing?.defaultCurrency ?? 'USD',
            taxMode: existingSettings?.defaults?.pricing?.taxMode ?? 'EXCLUSIVE',
          },
        },
      }
    });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch sales settings' }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'edit' });
    const body = await request.json();
    const parsed = salesSettingsSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const existingGlobalSettings = (tenant.settings as any) || {};

    const updatedSettings = {
      ...existingGlobalSettings,
      sales: {
        ...(existingGlobalSettings.sales || {}),
        defaults: parsed.defaults,
      }
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    return NextResponse.json({ data: { defaults: parsed.defaults } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to update sales settings' }, { status });
  }
}


