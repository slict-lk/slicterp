import { NextRequest, NextResponse } from 'next/server';
import { getLabTests, createLabTest } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const labTests = await getLabTests(tenantId);
        return NextResponse.json({ labTests });
    } catch (error) {
        console.error('Error fetching lab tests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch lab tests' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const data = await request.json();

        if (!data.code || !data.name || !data.category || !data.price) {
            return NextResponse.json(
                { error: 'Code, name, category, and price are required' },
                { status: 400 }
            );
        }

        const labTest = await createLabTest({
            code: data.code,
            name: data.name,
            category: data.category,
            description: data.description,
            price: parseFloat(data.price),
            resultTemplate: data.resultTemplate,
            tenantId,
        });

        return NextResponse.json(labTest, { status: 201 });
    } catch (error) {
        console.error('Error creating lab test:', error);
        return NextResponse.json(
            { error: 'Failed to create lab test' },
            { status: 500 }
        );
    }
}
