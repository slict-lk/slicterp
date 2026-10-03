import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getDataSourceDescriptors } from '@/apps/studio/data-connectors';

export async function GET(req: Request) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const descriptors = getDataSourceDescriptors();
    return NextResponse.json(formatSuccessResponse(descriptors));
  });
}
