import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';

// POST /api/properties/[id]/leases - Create a lease
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['tenantName', 'tenantEmail', 'startDate', 'endDate', 'monthlyRent'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const rent = parseFloat(body.monthlyRent);
    if (isNaN(rent)) {
      return NextResponse.json({ error: 'Invalid rent amount' }, { status: 400 });
    }

    const deposit = body.securityDeposit ? parseFloat(body.securityDeposit) : null;
    if (deposit !== null && isNaN(deposit)) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 });
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }
    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const lease = await prisma.propertyLease.create({
      data: {
        propertyId: id,
        tenantName: body.tenantName,
        tenantEmail: body.tenantEmail,
        tenantPhone: body.tenantPhone || null,
        startDate: startDate,
        endDate: endDate,
        monthlyRent: rent,
        securityDeposit: deposit,
        status: body.status || 'ACTIVE',
        contractUrl: body.contractUrl || null,
      },
      include: {
        property: true,
      }
    });

    // --- GL POSTING ---
    let glWarnings;
    try {
      const tenantId = lease.property?.tenantId;
      if (tenantId) {
        const rentAccounts = await resolveAccountCodes(tenantId, 'properties', 'RENT_INCOME');
        if (rentAccounts && lease.monthlyRent > 0) {
          await postToGL({
            tenantId,
            sourceModule: 'properties',
            sourceDocumentId: lease.id,
            sourceDocumentType: 'PropertyLease',
            eventType: 'RENT_INCOME',
            reference: `LEA-${lease.id.slice(-6)}`,
            description: `Property Lease Rent - ${lease.property?.title || 'Property'}`,
            date: new Date(),
            lines: [
              { accountCode: rentAccounts.debitCode, debit: lease.monthlyRent, credit: 0, description: 'Accounts Receivable (Rent)' },
              { accountCode: rentAccounts.creditCode, debit: 0, credit: lease.monthlyRent, description: 'Rental Income' }
            ]
          });
        }

        const depositAccounts = await resolveAccountCodes(tenantId, 'properties', 'SECURITY_DEPOSIT');
        if (depositAccounts && lease.securityDeposit && lease.securityDeposit > 0) {
          await postToGL({
            tenantId,
            sourceModule: 'properties',
            sourceDocumentId: lease.id,
            sourceDocumentType: 'PropertyLease',
            eventType: 'SECURITY_DEPOSIT',
            reference: `DEP-${lease.id.slice(-6)}`,
            description: `Security Deposit - ${lease.property?.title || 'Property'}`,
            date: new Date(),
            lines: [
              { accountCode: depositAccounts.debitCode, debit: lease.securityDeposit, credit: 0, description: 'Cash / Bank' },
              { accountCode: depositAccounts.creditCode, debit: 0, credit: lease.securityDeposit, description: 'Security Deposit Liability' }
            ]
          });
        }
      }
    } catch (error: any) {
      console.error('GL Bridge error (property lease):', error);
      glWarnings = error.message || 'GL posting failed';
    }

    return NextResponse.json({ ...lease, glWarnings }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lease:', error);
    return NextResponse.json(
      { error: 'Failed to create lease' },
      { status: 500 }
    );
  }
}

// GET /api/properties/[id]/leases - Get all leases for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const leases = await prisma.propertyLease.findMany({
      where: {
        propertyId: id,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leases);
  } catch (error: any) {
    console.error('Error fetching leases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leases' },
      { status: 500 }
    );
  }
}
