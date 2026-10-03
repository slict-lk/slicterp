import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// GET /api/agents - List all agents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const isActive = searchParams.get('isActive');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const agents = await prisma.propertyAgent.findMany({
      where: {
        tenantId,
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        properties: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                status: true,
                propertyType: true,
                listingType: true,
              },
            },
          },
        },
        _count: {
          select: {
            properties: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(agents);
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['tenantId', 'name', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const agent = await prisma.propertyAgent.create({
      data: {
        tenantId: body.tenantId,
        userId: body.userId || null,
        name: body.name,
        email: body.email,
        phone: body.phone,
        licenseNumber: body.licenseNumber || null,
        commission: body.commission ? parseFloat(body.commission) : null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent', details: error.message },
      { status: 500 }
    );
  }
}
