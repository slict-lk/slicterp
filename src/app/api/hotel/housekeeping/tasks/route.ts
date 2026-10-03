import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const assignedTo = searchParams.get('assignedTo');
        const status = searchParams.get('status');

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const where: any = { tenantId };
        if (assignedTo) where.assignedTo = assignedTo;
        if (status) where.status = status;

        const tasks = await prisma.housekeepingTask.findMany({
            where,
            include: {
                room: true
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json(tasks);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId, roomId, taskType, priority, assignedTo, notes } = body;

        if (!tenantId || !roomId || !taskType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const task = await prisma.housekeepingTask.create({
            data: {
                tenantId,
                roomId,
                taskType,
                priority: priority || 'NORMAL',
                assignedTo,
                notes,
                status: assignedTo ? 'ASSIGNED' : 'PENDING',
                assignedAt: assignedTo ? new Date() : undefined,
            },
            include: {
                room: true
            }
        });

        return NextResponse.json(task);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
