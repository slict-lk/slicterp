
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            name, email, phone,
            make, model, yearFrom, yearTo,
            fuel, fuelType, transmission,
            message, storeSlug
        } = body;

        // Basic Validation
        if (!storeSlug || !name || !email) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create Vehicle Request (Enterprise Workflow: Default Status = NEW, Priority = MEDIUM)
        const newRequest = await prisma.vehicleRequest.create({
            data: {
                storeSlug,
                customerName: name,
                email,
                phone,
                budget: null, // Can be added to form later if needed
                vehicleDetails: {
                    make,
                    model,
                    yearFrom,
                    yearTo,
                    fuel,
                    fuelType,
                    transmission
                },
                status: 'NEW',
                priority: 'MEDIUM',
                // Internal notes would be added via a separate endpoint/process
                notes: message ? {
                    create: {
                        content: `Customer Message: ${message}`,
                        // authorId: null (System/Customer note)
                    }
                } : undefined
            }
        });

        return NextResponse.json({
            success: true,
            ticketNumber: newRequest.ticketNumber,
            id: newRequest.id
        });

    } catch (error) {
        console.error('Failed to create vehicle request:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
