import { NextRequest, NextResponse } from 'next/server';
import { getBOMs, createBOM } from '@/apps/manufacturing/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    
    const boms = await getBOMs(tenantId);
    return NextResponse.json(boms);
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BOMs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    const data = await request.json();
    
    const bom = await createBOM({
      ...data,
      tenantId,
    });
    
    return NextResponse.json(bom, { status: 201 });
  } catch (error) {
    console.error('Error creating BOM:', error);
    return NextResponse.json(
      { error: 'Failed to create BOM' },
      { status: 500 }
    );
  }
}
