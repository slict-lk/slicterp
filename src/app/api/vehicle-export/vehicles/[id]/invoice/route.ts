
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/vehicle-export/vehicles/[id]/invoice
// Generate or Fetch Invoice
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: vehicleId } = await params;

        // 1. Check existing invoice
        const existingInvoice = await (prisma as any).exportInvoice.findUnique({
            where: { vehicleId },
            include: { items: true },
        });

        if (existingInvoice) {
            return NextResponse.json(existingInvoice);
        }

        // 2. Generate New Draft
        const vehicle = await prisma.exportVehicle.findUnique({
            where: { id: vehicleId },
            include: { yardJobs: true }
        }) as any;

        if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

        // Calculate Costs
        const purchasePrice = Number(vehicle.purchasePrice) || 0;
        const auctionFee = Number(vehicle.auctionFee) || 0;
        const transportCost = Number(vehicle.transportCost) || 0; // Inland
        const shippingCost = Number(vehicle.shippingCost) || 0; // Ocean
        const inspectionCost = Number(vehicle.inspectionCost) || 0;

        // Yard Costs (Labor + Materials) - simplified calculation
        const yardCost = (vehicle.yardJobs || []).reduce((acc: number, job: any) => {
            const labor = Number(job.cost) || 0;
            return acc + labor;
        }, 0);


        // Commission / Margin (Example: Fixed $500 or percentage?)
        // Let's assume a default fixed margin for now, or fetch from Config?
        // Using $500 as per user example.
        const commission = 500;

        const totalAmount = purchasePrice + auctionFee + transportCost + shippingCost + inspectionCost + yardCost + commission;

        // Create Invoice
        const invoice = await (prisma as any).exportInvoice.create({

            data: {
                tenantId: user.tenantId,
                vehicleId,
                invoiceNumber: `INV-${vehicle.stockNumber}`, // Simple format
                purchasePrice,
                auctionFee,
                transportCost,
                shippingCost,
                inspectionCost,
                yardCost,
                commission,
                otherCost: 0,
                totalAmount,
                currency: vehicle.currency || 'USD', // Default to vehicle currency
                status: 'DRAFT',
                // Create Line Items details
                items: {
                    create: [
                        { description: `Vehicle Purchase: ${vehicle.make} ${vehicle.model}`, amount: purchasePrice },
                        { description: 'Auction Fee', amount: auctionFee },
                        { description: 'Inland Transport', amount: transportCost },
                        { description: 'Ocean Freight', amount: shippingCost },
                        { description: 'Inspection Fees', amount: inspectionCost },
                        { description: 'Yard Services & Repairs', amount: yardCost },
                        { description: 'Service Commission', amount: commission },
                    ].filter(i => i.amount > 0)
                }
            },
            include: { items: true }
        });

        return NextResponse.json(invoice);

    } catch (error) {
        console.error('Error generating invoice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
