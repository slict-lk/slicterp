import { NextRequest, NextResponse } from 'next/server';
import { getUserExperiencePreferences, updateUserExperiencePreferences } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId, user } = await requireAIAccess('view');
    const preferences = await getUserExperiencePreferences(
      tenantId,
      user.id,
      user.isSuperAdmin || String(user.role || '').toUpperCase() === 'ADMIN'
    );
    return NextResponse.json(preferences);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error fetching AI preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch AI preferences' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { tenantId, user } = await requireAIAccess('view');
    const body = await request.json();
    const preferences = await updateUserExperiencePreferences(
      tenantId,
      user.id,
      body || {},
      user.isSuperAdmin || String(user.role || '').toUpperCase() === 'ADMIN'
    );
    return NextResponse.json(preferences);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating AI preferences:', error);
    return NextResponse.json({ error: 'Failed to update AI preferences' }, { status: 500 });
  }
}
