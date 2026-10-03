import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/properties/[id]/agents - Assign an agent to a property
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check if agent exists
    const agent = await prisma.propertyAgent.findUnique({
      where: { id: body.agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.propertyAgentAssignment.findFirst({
      where: {
        propertyId: id,
        agentId: body.agentId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Agent is already assigned to this property' },
        { status: 400 }
      );
    }

    const assignment = await prisma.propertyAgentAssignment.create({
      data: {
        propertyId: id,
        agentId: body.agentId,
        role: body.role || 'PRIMARY',
      },
      include: {
        agent: {
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
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any) {
    console.error('Error assigning agent:', error);
    return NextResponse.json(
      { error: 'Failed to assign agent', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/properties/[id]/agents - Get all agents assigned to a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assignments = await prisma.propertyAgentAssignment.findMany({
      where: {
        propertyId: id,
      },
      include: {
        agent: {
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
        },
      },
      orderBy: { assignedAt: 'asc' },
    });

    return NextResponse.json(assignments);
  } catch (error: any) {
    console.error('Error fetching assigned agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assigned agents', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[id]/agents - Remove an agent assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    await prisma.propertyAgentAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({ message: 'Agent assignment removed successfully' });
  } catch (error: any) {
    console.error('Error removing agent assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove agent assignment', details: error.message },
      { status: 500 }
    );
  }
}
