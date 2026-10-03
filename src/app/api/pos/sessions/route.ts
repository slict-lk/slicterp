import { NextRequest, NextResponse } from 'next/server';
import { getPOSSessions, openPOSSession } from '@/apps/pos/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordSafeOperationalEvent } from '@/lib/intelligence/events/safe-operational-events';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'OPEN' | 'CLOSED' | undefined;
    
    const sessions = await getPOSSessions(tenantId, status);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching POS sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POS sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    const data = await request.json();
    
    const session = await openPOSSession({
      ...data,
      tenantId,
    });

    await recordSafeOperationalEvent({
      tenantId,
      moduleKey: 'pos',
      entityType: 'POS_SESSION',
      entityId: session.id,
      action: 'POS_SESSION_OPENED',
      actorUserId: session.userId ?? data.userId ?? null,
      metadata: {
        posConfigId: session.posConfigId,
        openingCash: Number(session.openingCash ?? 0),
        status: session.status,
      },
    });
    
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error creating POS session:', error);
    return NextResponse.json(
      { error: 'Failed to create POS session' },
      { status: 500 }
    );
  }
}
