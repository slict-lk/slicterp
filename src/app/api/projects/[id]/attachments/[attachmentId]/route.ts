import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { resolveProjectActor, requireProjectAccess } from '@/apps/projects/access-policy';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'delete' });
    const actor = await resolveProjectActor(user);
    const { id: projectId, attachmentId } = await params;
    await requireProjectAccess(actor, projectId, 'manage');
    const attachment = await prisma.projectAttachment.findFirst({ where: { id: attachmentId, projectId, tenantId: actor.tenantId } });
    if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    if (attachment.storageKey) await cloudinary.uploader.destroy(attachment.storageKey, { resource_type: attachment.fileType.startsWith('image/') ? 'image' : 'raw' });
    await prisma.projectAttachment.delete({ where: { id: attachment.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'File deletion failed' }, { status: /denied|Forbidden/.test(error.message) ? 403 : 500 });
  }
}
