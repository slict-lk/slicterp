import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function POST(req: NextRequest) {
    try {
        const { subdomain, vehicleId, portId } = await req.json();

        if (!subdomain || !vehicleId || !portId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Resolve tenant ID
        // Resolve tenant ID
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { subdomain },
                    { domain: subdomain }
                ],
            },
            select: { id: true },
        });

        if (!tenant) {
            return NextResponse.json(
                { error: "Store not found" },
                { status: 404 }
            );
        }

        // 1. Get Vehicle FOB Price
        const vehicle = await prisma.exportVehicle.findUnique({
            where: { id: vehicleId, tenantId: tenant.id },
            select: { fobPrice: true },
        });

        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        // 2. Get Port Costs
        const port = await prisma.exportPort.findUnique({
            where: { id: portId, tenantId: tenant.id },
        });

        if (!port) {
            return NextResponse.json({ error: "Port not found" }, { status: 404 });
        }

        // 3. Calculate CIF
        const fob = new Decimal(vehicle.fobPrice);
        let shipping = new Decimal(0);
        let insurance = new Decimal(0);
        let inspection = new Decimal(0);
        let askForPrice = false;

        if (port.shippingCost === null) {
            askForPrice = true;
        } else {
            shipping = new Decimal(port.shippingCost);
        }

        if (port.insuranceCost !== null) {
            insurance = new Decimal(port.insuranceCost);
        }

        if (port.inspectionFee !== null) {
            inspection = new Decimal(port.inspectionFee);
        }

        const cif = askForPrice ? null : fob.plus(shipping).plus(insurance).plus(inspection);

        return NextResponse.json({
            fob: fob.toNumber(),
            shipping: port.shippingCost ? shipping.toNumber() : null,
            insurance: port.insuranceCost ? insurance.toNumber() : null,
            inspection: port.inspectionFee ? inspection.toNumber() : null,
            cif: cif ? cif.toNumber() : null,
            askForPrice,
        });

    } catch (error) {
        console.error("Failed to calculate shipping:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
