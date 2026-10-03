import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { resolveProjectActor, requireProjectAccess } from '@/apps/projects/access-policy';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain',
]);

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' });
    const actor = await resolveProjectActor(user);
    const projectId = (await params).id;
    await requireProjectAccess(actor, projectId, 'contribute');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File exceeds the 10 MB limit' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `projects/${actor.tenantId}/${projectId}`;
    const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
      stream.end(buffer);
    });
    const attachment = await prisma.projectAttachment.create({
      data: { tenantId: actor.tenantId, projectId, uploadedById: actor.id, fileName: file.name, fileType: file.type, fileSize: file.size, url: result.secure_url, storageKey: result.public_id },
    });
    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'File upload failed' }, { status: /denied|Forbidden/.test(error.message) ? 403 : 500 });
  }
}
