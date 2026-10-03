import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    let tenantId: string | null = null;

    if (subdomain) {
      const tenant = await prisma.tenant.findUnique({
        where: { subdomain },
        select: { id: true, logo: true },
      });
      if (tenant?.logo) {
        return new NextResponse(tenant.logo, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    const user = await getCurrentUser();
    if (user?.tenantId) {
      tenantId = user.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logo: true },
    });

    if (!tenant?.logo) {
      return NextResponse.json({ error: 'No logo found' }, { status: 404 });
    }

    return new NextResponse(tenant.logo, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Logo fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch logo' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const processed = await sharp(buffer)
      .resize(400, 100, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { logo: new Uint8Array(processed) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { logo: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
