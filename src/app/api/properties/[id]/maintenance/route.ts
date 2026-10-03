import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';

// POST /api/properties/[id]/maintenance - Create a maintenance request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const parsedCost = body.cost != null ? parseFloat(body.cost) : null;
    if (parsedCost !== null && isNaN(parsedCost)) {
      return NextResponse.json({ error: 'Invalid cost value: must be a number' }, { status: 400 });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const maintenance = await prisma.propertyMaintenance.create({
      data: {
        propertyId: id,
        title: body.title,
        description: body.description,
        priority: body.priority || 'MEDIUM',
        status: body.status || 'PENDING',
        assignedTo: body.assignedTo || null,
        cost: parsedCost,
      },
      include: {
        property: true,
      }
    });

    // --- GL POSTING ---
    try {
      const tenantId = maintenance.property?.tenantId;
      if (tenantId && maintenance.cost && maintenance.cost > 0) {
        const expenseAccounts = await resolveAccountCodes(tenantId, 'properties', 'MAINTENANCE_EXP');
        if (!expenseAccounts?.debitCode || !expenseAccounts?.creditCode) {
          throw new Error(`Missing account mappings for property maintenance: ${maintenance.id}`);
        }

        await postToGL({
          tenantId,
          sourceModule: 'properties',
          sourceDocumentId: maintenance.id,
          sourceDocumentType: 'PropertyMaintenance',
          eventType: 'MAINTENANCE_EXP',
          reference: `MNT-${maintenance.id.slice(-6)}`,
          description: `Property Maintenance - ${maintenance.title}`,
          date: new Date(),
          lines: [
            { accountCode: expenseAccounts.debitCode, debit: maintenance.cost, credit: 0, description: 'Maintenance Expense' },
            { accountCode: expenseAccounts.creditCode, debit: 0, credit: maintenance.cost, description: 'Accounts Payable / Cash' }
          ]
        });
      }
    } catch (error) {
      console.error('GL Bridge error (property maintenance):', error);
    }

    return NextResponse.json(maintenance, { status: 201 });
  } catch (error: any) {
    console.error('Error creating maintenance request:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance request' },
      { status: 500 }
    );
  }
}

// GET /api/properties/[id]/maintenance - Get all maintenance requests for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const maintenances = await prisma.propertyMaintenance.findMany({
      where: {
        propertyId: id,
        ...(status && { status }),
        ...(priority && { priority: priority as any }),
      },
      orderBy: { reportedAt: 'desc' },
    });

    return NextResponse.json(maintenances);
  } catch (error: any) {
    console.error('Error fetching maintenance requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance requests' },
      { status: 500 }
    );
  }
}
