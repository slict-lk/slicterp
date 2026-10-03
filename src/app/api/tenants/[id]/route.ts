
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const { id } = await params;

        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                _count: { select: { users: true } },
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!tenant) {
            return new NextResponse('Tenant not found', { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error) {
        console.error('Error fetching tenant:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();

        // Extract allowed fields
        const { name, companyName, plan, status, subdomain } = body;

        // Build update data
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (plan !== undefined) updateData.plan = plan;
        if (status !== undefined) updateData.status = status;
        // Note: subdomain changes are risky, only allow if explicitly needed
        // if (subdomain !== undefined) updateData.subdomain = subdomain;

        const tenant = await prisma.tenant.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(tenant);
    } catch (error) {
        console.error('Error updating tenant:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const { id } = await params;
        const url = new URL(req.url);
        const forceDelete = url.searchParams.get('force') === 'true';

        // Check if tenant has users
        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } },
        });

        if (!tenant) {
            return new NextResponse('Tenant not found', { status: 404 });
        }

        if (tenant._count.users > 0 && !forceDelete) {
            return NextResponse.json(
                {
                    error: 'Cannot delete tenant with active users',
                    userCount: tenant._count.users,
                    requiresForce: true
                },
                { status: 400 }
            );
        }

        // If force delete, remove all users first in a transaction
        if (forceDelete && tenant._count.users > 0) {
            await prisma.$transaction([
                prisma.user.deleteMany({ where: { tenantId: id } }),
                prisma.tenant.delete({ where: { id } }),
            ]);
        } else {
            await prisma.tenant.delete({ where: { id } });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting tenant:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

