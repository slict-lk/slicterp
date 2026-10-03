import { NextRequest, NextResponse } from 'next/server';
import { generateReorderSuggestions } from '@/apps/spareparts/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const suggestions = await generateReorderSuggestions(user.tenantId);
        return NextResponse.json({
            suggestions,
            count: suggestions.length
        });
    } catch (error) {
        console.error('Error generating reorder suggestions:', error);
        return NextResponse.json(
            { error: 'Failed to generate reorder suggestions' },
            { status: 500 }
        );
    }
}
