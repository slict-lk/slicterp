
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hash } from 'bcryptjs';
import { generateDefaultModulePermissions } from '@/lib/modules';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const tenants = await prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        return NextResponse.json(tenants);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const body = await req.json();
        const { name, companyName, email, subdomain, plan, adminName, adminEmail, adminPassword, domain } = body;

        // Validate required fields
        if (!name || !companyName || !subdomain || !adminEmail || !adminPassword) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Check if subdomain exists
        const existingTenant = await prisma.tenant.findUnique({
            where: { subdomain }
        });

        if (existingTenant) {
            return new NextResponse('Subdomain already taken', { status: 400 });
        }

        // Check if custom domain exists
        if (domain) {
            const existingDomain = await prisma.tenant.findUnique({
                where: { domain }
            });
            if (existingDomain) {
                return new NextResponse('Custom domain already taken', { status: 400 });
            }
        }

        // Check if admin email exists
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return new NextResponse('Admin email already registered', { status: 400 });
        }

        const hashedPassword = await hash(adminPassword, 12);

        // Generate permissions based on selected modules (if provided)
        let modulePermissions = generateDefaultModulePermissions('ADMIN') as Record<string, any>;

        if (body.modules && Array.isArray(body.modules) && body.modules.length > 0) {
            // Filter permissions to only include selected modules
            const selectedModules = new Set(body.modules);
            const filteredPermissions: Record<string, any> = {};

            for (const [moduleId, permission] of Object.entries(modulePermissions)) {
                if (selectedModules.has(moduleId)) {
                    filteredPermissions[moduleId] = permission;
                } else {
                    // Disable non-selected modules
                    filteredPermissions[moduleId] = {
                        ...(permission as any),
                        enabled: false,
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                    };
                }
            }
            modulePermissions = filteredPermissions;
        } else {
            // If no modules specified, disable all modules by default
            for (const [moduleId, permission] of Object.entries(modulePermissions)) {
                modulePermissions[moduleId] = {
                    ...(permission as any),
                    enabled: false,
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                };
            }
            // Always enable core modules
            const coreModules = ['dashboard', 'settings', 'users'];
            coreModules.forEach(moduleId => {
                if (modulePermissions[moduleId]) {
                    modulePermissions[moduleId] = {
                        ...(modulePermissions[moduleId] as any),
                        enabled: true,
                        view: true,
                        create: true,
                        edit: true,
                        delete: true,
                    };
                }
            });
        }

        // Create tenant and admin user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    companyName,
                    subdomain,
                    domain: domain || null,
                    plan: plan || 'STARTER',
                    status: 'ACTIVE',
                }
            });

            const user = await tx.user.create({
                data: {
                    name: adminName || 'Admin',
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    isSuperAdmin: false,
                    tenantId: tenant.id,
                    isActive: true,
                    modulePermissions: modulePermissions as any
                }
            });

            return { tenant, user };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error creating tenant:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
