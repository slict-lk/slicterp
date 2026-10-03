import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { executeDataConnector } from '@/apps/studio/data-connectors';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function POST(req: Request) {
    return tryCatch(async () => {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const body = await req.json();

        if (!body.connectorId) {
            return NextResponse.json({ error: 'connectorId is required' }, { status: 400 });
        }

        try {
            const result = await executeDataConnector(body.connectorId, body.config || {}, tenant.id);
            return NextResponse.json(formatSuccessResponse(result));
        } catch (err) {
            console.error('[Studio] Data source preview failed:', err);
            return NextResponse.json({ error: 'Data source preview failed' }, { status: 400 });
        }
    });
}
