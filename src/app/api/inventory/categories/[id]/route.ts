import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return tryCatch(async () => {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();

    const category = await (prisma as any).productCategory.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
        parent: true,
        children: {
          include: {
            _count: {
              select: {
                products: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(formatSuccessResponse(category));
  }, 'Failed to fetch category');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return tryCatch(async () => {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // Check if category exists and belongs to tenant
    const existingCategory = await (prisma as any).productCategory.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate names within the same parent (excluding current category)
    const duplicateCategory = await (prisma as any).productCategory.findFirst({
      where: {
        tenantId: tenant.id,
        name: body.name,
        parentId: body.parentId || null,
        NOT: {
          id,
        },
      },
    });

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists in the selected parent category' },
        { status: 400 }
      );
    }

    // Prevent circular references
    if (body.parentId) {
      // Prevent self-reference
      if (body.parentId === id) {
        return NextResponse.json(
          { error: 'A category cannot be its own parent' },
          { status: 400 }
        );
      }

      const parentCategory = await (prisma as any).productCategory.findUnique({
        where: { id: body.parentId },
      });

      if (!parentCategory || parentCategory.tenantId !== tenant.id) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }

      // Check if this would create a circular reference
      let currentParent = parentCategory;
      while (currentParent.parentId) {
        if (currentParent.parentId === id) {
          return NextResponse.json(
            { error: 'Cannot create circular category hierarchy' },
            { status: 400 }
          );
        }
        currentParent = await (prisma as any).productCategory.findUnique({
          where: { id: currentParent.parentId },
        });
      }
    }

    const category = await (prisma as any).productCategory.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        parentId: body.parentId || null,
      },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
        parent: true,
        children: {
          include: {
            _count: {
              select: {
                products: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      formatSuccessResponse(category, 'Category updated successfully')
    );
  }, 'Failed to update category');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return tryCatch(async () => {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();

    // Check if category exists and belongs to tenant
    const category = await (prisma as any).productCategory.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if category has products or children
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category._count.products} products. Please reassign or delete the products first.`
        },
        { status: 400 }
      );
    }

    if (category._count.children > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category._count.children} subcategories. Please delete or reassign the subcategories first.`
        },
        { status: 400 }
      );
    }

    await (prisma as any).productCategory.delete({
      where: { id },
    });

    return NextResponse.json(
      formatSuccessResponse(null, 'Category deleted successfully')
    );
  }, 'Failed to delete category');
}
