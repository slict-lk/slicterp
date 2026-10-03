import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { tryCatch } from '@/lib/error-handler';
import { syncModulePermissions } from '@/lib/modules';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return tryCatch(async () => {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = dbUser;
    return NextResponse.json(userWithoutPassword);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return tryCatch(async () => {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role or is updating themselves
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'ADMIN' && user.id !== id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.email !== undefined) {
      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email: body.email,
          tenantId: user.tenantId,
          NOT: { id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already taken' },
          { status: 409 }
        );
      }
      updateData.email = body.email;
    }

    // Handle Role ID updates (DB-based Roles)
    if (body.roleId !== undefined && user.role === 'ADMIN') {
      const assignedRoleId = body.roleId;

      if (assignedRoleId) {
        // Fetch the new role
        const dbRole = await prisma.role.findFirst({
          where: { id: assignedRoleId, tenantId: user.tenantId }
        });

        if (dbRole) {
          updateData.userRoleId = assignedRoleId;
          updateData.role = dbRole.code; // Sync legacy code
          updateData.modulePermissions = dbRole.permissions as any; // Copy permissions
          console.log(`✅ [PATCH] Updated user role to DB Role: ${dbRole.name}`);
        } else {
          console.warn(`⚠️ [PATCH] Role ID ${assignedRoleId} not found`);
        }
      } else {
        // Clearing the role
        updateData.userRoleId = null;
      }
    }

    // Handle Legacy Role updates (fallback)
    if (body.role !== undefined && user.role === 'ADMIN' && !body.roleId) {
      updateData.role = body.role;

      // Type assertion until Prisma client is regenerated
      const targetUserWithPermissions = targetUser as typeof targetUser & {
        modulePermissions?: Record<string, unknown>;
        role?: string;
      };

      // When role changes, sync module permissions to match new role
      if (body.role !== targetUserWithPermissions.role) {
        const existingPermissions = (targetUserWithPermissions.modulePermissions as Record<string, unknown>) || {};
        updateData.modulePermissions = syncModulePermissions(
          existingPermissions,
          body.role as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
        );
      }
    }

    if (body.isActive !== undefined && user.role === 'ADMIN') {
      updateData.isActive = body.isActive;
    }

    // Allow admins to update module permissions directly
    if (body.modulePermissions !== undefined && user.role === 'ADMIN') {
      updateData.modulePermissions = body.modulePermissions;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return tryCatch(async () => {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is trying to delete themselves
    if (user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Only admins can delete users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  });
}
