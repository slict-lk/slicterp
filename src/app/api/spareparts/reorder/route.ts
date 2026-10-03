import { NextRequest, NextResponse } from 'next/server';
import { getReorderSuggestions } from '@/apps/spareparts/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;

        const suggestions = await getReorderSuggestions(user.tenantId, status);
        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error fetching reorder suggestions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reorder suggestions' },
            { status: 500 }
        );
    }
}
