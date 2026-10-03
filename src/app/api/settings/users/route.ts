import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { generateDefaultModulePermissions } from '@/lib/modules';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const user = await getCurrentUser();

    console.log('🔍 GET /api/settings/users - User info:', {
      email: user?.email,
      role: user?.role,
      tenantId: user?.tenantId,
      hasUser: !!user,
      hasTenantId: !!user?.tenantId
    });

    if (!user?.tenantId) {
      console.error('❌ No authenticated user found. Please log in.');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to access user management' },
        { status: 401 }
      );
    }

    console.log('✅ Fetching users for tenant:', user.tenantId);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const role = searchParams.get('role') as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' | null;
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role }),
      ...(isActive !== null && { isActive: isActive === 'true' }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          userRole: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json(
      formatPaginatedResponse(users, page, limit, total)
    );
  }, 'Failed to fetch users');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const user = await getCurrentUser();

    console.log('🔍 POST /api/settings/users - User info:', {
      email: user?.email,
      role: user?.role,
      tenantId: user?.tenantId,
      hasUser: !!user,
      hasTenantId: !!user?.tenantId
    });

    if (!user?.tenantId) {
      console.error('❌ No tenant ID found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check permissions
    const { requirePermission } = await import('@/lib/auth');
    await requirePermission('users', 'create');

    console.log('✅ Permission granted - proceeding with user creation');

    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: body.email,
        tenantId: user.tenantId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Password is required - generate temporary password if not provided
    let hashedPassword: string;
    if (body.password) {
      const bcrypt = await import('bcryptjs');

      hashedPassword = await bcrypt.default.hash(body.password, 10);
    } else {
      // Generate a random temporary password
      const bcrypt = await import('bcryptjs');

      const crypto = await import('crypto');

      const tempPassword = crypto.randomBytes(16).toString('hex');
      hashedPassword = await bcrypt.default.hash(tempPassword, 10);
    }

    // Determine user role and permissions
    let userRole = (body.role as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER') || 'USER';
    let modulePermissions;
    let titleRole = userRole;
    let assignedRoleId = body.roleId;

    // If roleId is provided, fetch the role from DB
    if (assignedRoleId) {
      const dbRole = await prisma.role.findFirst({
        where: { id: assignedRoleId, tenantId: user.tenantId }
      });

      if (dbRole) {
        userRole = dbRole.code as any; // Set legacy role code
        modulePermissions = dbRole.permissions; // Inherit permissions from Role
        console.log(`✅ Using DB Role: ${dbRole.name} (${dbRole.code})`);
      } else {
        console.warn(`⚠️ Role ID ${assignedRoleId} not found for tenant, falling back to legacy role: ${userRole}`);
        assignedRoleId = undefined;
      }
    }

    // Fallback or override logic
    if (!assignedRoleId) {
      // ... existing logic for custom permissions or defaults
    }

    if (!modulePermissions) {
      if (body.modulePermissions && typeof body.modulePermissions === 'object') {
        const defaultPermissions = generateDefaultModulePermissions(userRole);
        modulePermissions = { ...defaultPermissions, ...body.modulePermissions };

        if (userRole === 'ADMIN') {
          modulePermissions = generateDefaultModulePermissions('ADMIN');
        }
      } else {
        modulePermissions = generateDefaultModulePermissions(userRole);
      }
    }

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: hashedPassword,
        tenantId: user.tenantId,
        isActive: body.isActive !== undefined ? body.isActive : true,
        role: userRole,
        modulePermissions: modulePermissions as any,
        userRoleId: assignedRoleId,
      },
    });

    // Remove password from response
    const { password: _password, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      formatSuccessResponse(userWithoutPassword, 'User created successfully with module permissions'),
      { status: 201 }
    );
  }, 'Failed to create user');
}

