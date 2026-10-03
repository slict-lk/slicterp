import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'Tenant ID is required' },
                { status: 400 }
            );
        }

        const requests = await prisma.maintenanceRequest.findMany({
            where: { tenantId },
            include: {
                room: {
                    select: { roomNumber: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error('Failed to fetch maintenance requests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch requests' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId, roomId, category, description, priority, location, reportedBy } = body;

        let resolvedRoomId = null;
        if (roomId) {
            // Try to find the room
            const room = await prisma.hotelRoom.findFirst({
                where: {
                    tenantId,
                    roomNumber: roomId
                }
            });
            if (room) {
                resolvedRoomId = room.id;
            }
        }

        const maintenanceRequest = await prisma.maintenanceRequest.create({
            data: {
                tenantId,
                roomId: resolvedRoomId,
                location: !resolvedRoomId ? location : undefined,
                category,
                description,
                priority,
                reportedBy,
                status: 'OPEN',
            },
        });

        return NextResponse.json(maintenanceRequest);
    } catch (error) {
        console.error('Failed to create maintenance request:', error);
        return NextResponse.json(
            { error: 'Failed to create request' },
            { status: 500 }
        );
    }
}
