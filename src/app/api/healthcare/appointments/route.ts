import { NextRequest, NextResponse } from 'next/server';
import { getAppointments } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

// Legacy appointments endpoint - now redirects to visits system
// The appointments model has been replaced by MedicalVisit

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const date = dateStr ? new Date(dateStr) : undefined;

    // Legacy function returns empty array - use /api/healthcare/visits instead
    const appointments = await getAppointments(tenantId, date);
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments. Use /api/healthcare/visits instead.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Redirect to new visits endpoint
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/healthcare/visits instead.' },
    { status: 410 }
  );
}
