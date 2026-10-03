import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const includeChildren = searchParams.get('includeChildren') === 'true';

    const where: any = {
      tenantId: tenant.id,
    };

    if (parentId) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    const categories = await prisma.invCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
        ...(includeChildren && {
          children: {
            include: {
              _count: {
                select: {
                  products: true,
                },
              },
            },
          },
        }),
      },
      orderBy: [
        { parentId: 'asc' },
        { name: 'asc' },
      ],
    });

    // Build hierarchical structure if requested
    let result = categories;
    if (includeChildren) {
      const categoryMap = new Map();
      const rootCategories: any[] = [];

      // First pass: create map and identify roots
      categories.forEach((category: any) => {
        // Initialize with existing children if Prisma already loaded some (e.g. nested include)
        categoryMap.set(category.id, { ...category, children: [...(category.children || [])] });
        if (!category.parentId) {
          rootCategories.push(categoryMap.get(category.id));
        }
      });

      // Second pass: build hierarchy
      categories.forEach((category: any) => {
        if (category.parentId) {
          const parent = categoryMap.get(category.parentId);
          const current = categoryMap.get(category.id);
          if (parent && current) {
            // Avoid duplicates if already present from Prisma's own nested children
            if (!parent.children.some((c: any) => c.id === current.id)) {
              parent.children.push(current);
            }
          }
        }
      });

      result = rootCategories;
    }

    return NextResponse.json(formatSuccessResponse(result));
  }, 'Failed to fetch categories');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // Normalize parentId: treat 'null' string and empty as null
    const parentId = (!body.parentId || body.parentId === 'null') ? null : body.parentId;

    // Application-level uniqueness check for root categories (parentId is null)
    if (!parentId) {
      const existing = await prisma.invCategory.findFirst({
        where: {
          tenantId: tenant.id,
          name: body.name,
          parentId: null,
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'A root category with this name already exists.' }, { status: 400 });
      }
    }

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate names within the same parent
    const existingCategory = await prisma.invCategory.findFirst({
      where: {
        tenantId: tenant.id,
        name: body.name,
        parentId: parentId,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists in the selected parent category' },
        { status: 400 }
      );
    }

    // Prevent circular references
    if (parentId) {
      const parentCategory = await prisma.invCategory.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }

      // Check if this would create a circular reference
      let currentParent = parentCategory;
      while (currentParent.parentId) {
        if (currentParent.parentId === parentId) {
          return NextResponse.json(
            { error: 'Cannot create circular category hierarchy' },
            { status: 400 }
          );
        }
        const nextParent: any = await prisma.invCategory.findUnique({
          where: { id: currentParent.parentId },
        });
        if (!nextParent) break;
        currentParent = nextParent;
      }
    }

    const category = await prisma.invCategory.create({
      data: {
        name: body.name,
        description: body.description,
        parentId: parentId,
        tenantId: tenant.id,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json(
      formatSuccessResponse(category, 'Category created successfully')
    );
  }, 'Failed to create category');
}

