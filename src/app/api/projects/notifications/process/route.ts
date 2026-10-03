import { NextResponse } from 'next/server';
import { processProjectNotificationOutbox } from '@/apps/projects/notifications';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function POST() { try { await requireTenantContext({ moduleId: 'projects', action: 'approve' }); return NextResponse.json({ data: await processProjectNotificationOutbox() }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); } }
