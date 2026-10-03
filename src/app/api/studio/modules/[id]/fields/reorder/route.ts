import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getCustomModuleById } from '@/apps/studio/api';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
  const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const body: { fieldIds: string[] } = await req.json();

        if (!Array.isArray(body.fieldIds)) {
            return NextResponse.json({ error: 'fieldIds array is required' }, { status: 400 });
        }

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const moduleFields = await prisma.customModuleField.findMany({
            where: { moduleId: module.id },
            select: { id: true },
        });
        const validFieldIds = new Set(moduleFields.map(f => f.id));
        const uniqueInput = new Set(body.fieldIds);
        if (uniqueInput.size !== body.fieldIds.length) {
            return NextResponse.json({ error: 'Duplicate field IDs in request' }, { status: 400 });
        }
        if (uniqueInput.size !== validFieldIds.size || body.fieldIds.some((fid: string) => !validFieldIds.has(fid))) {
            return NextResponse.json({ error: 'fieldIds must contain every field of this module exactly once' }, { status: 400 });
        }

        await prisma.$transaction(
          body.fieldIds.map((fid: string, i: number) =>
            prisma.customModuleField.update({
              where: { id: fid },
              data: { sequence: i },
            })
          )
        );

        return NextResponse.json(formatSuccessResponse({ success: true, message: 'Fields reordered successfully' }));
    });
}
