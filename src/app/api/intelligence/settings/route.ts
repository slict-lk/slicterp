import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import {
  DEFAULT_INTELLIGENCE_SETTINGS,
  getIntelligenceSettings,
  restoreDefaultIntelligenceSettings,
  updateIntelligenceSettings,
} from '@/lib/intelligence/settings/intelligence-settings-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const settings = await getIntelligenceSettings(prisma, tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        settings,
        defaults: DEFAULT_INTELLIGENCE_SETTINGS,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'edit' }, { moduleId: 'ai', action: 'edit' }]);

    const body = await request.json();
    const settings = await updateIntelligenceSettings(prisma, tenant.id, body ?? {});

    return NextResponse.json({
      success: true,
      data: { settings },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'edit' }, { moduleId: 'ai', action: 'edit' }]);

    const body = await request.json();
    if (body?.action !== 'restore_defaults') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Unsupported settings action',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const settings = await restoreDefaultIntelligenceSettings(prisma, tenant.id);
    return NextResponse.json({
      success: true,
      data: { settings },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
