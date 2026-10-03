import { NextRequest, NextResponse } from 'next/server';
import { rejectReorderSuggestion } from '@/apps/spareparts/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const reason = body.reason || 'No reason provided';

        const suggestion = await rejectReorderSuggestion(id, user.id, reason, user.tenantId);
        return NextResponse.json(suggestion);
    } catch (error) {
        console.error('Error rejecting suggestion:', error);
        return NextResponse.json(
            { error: 'Failed to reject suggestion' },
            { status: 500 }
        );
    }
}
