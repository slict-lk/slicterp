import { NextRequest, NextResponse } from 'next/server';
import { approveReorderSuggestion } from '@/apps/spareparts/api';
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
        const suggestion = await approveReorderSuggestion(id, user.id, user.tenantId);
        return NextResponse.json(suggestion);
    } catch (error) {
        console.error('Error approving suggestion:', error);
        return NextResponse.json(
            { error: 'Failed to approve suggestion' },
            { status: 500 }
        );
    }
}
