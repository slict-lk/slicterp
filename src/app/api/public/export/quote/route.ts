import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";
import { sendQuoteConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            subdomain,
            vehicleId,
            name,
            email,
            phone,
            address,
            countryId,
            portId,
            customerId
        } = body;

        console.log("Quote Request Received:", { subdomain, vehicleId, portId, email });

        if (!subdomain || !vehicleId || !name || !email || !countryId || !portId) {
            console.error("Missing fields in quote request");
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // 1. Resolve Tenant
        // We assume Tenant model exists and has subdomain/domains.
        // If not, we try to match ExportStoreConfig directly if it had subdomain logic, but previous file used 'tenant' relation on Config which was missing.
        // Let's try finding Tenant first.
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { subdomain },
                    { domain: subdomain }
                ]
            },
            select: { id: true }
        });

        if (!tenant) {
            console.error("Tenant not found for subdomain:", subdomain);
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }
        console.log("Resolved Tenant:", tenant.id);

        // 2. Get Vehicle
        const vehicle = await prisma.exportVehicle.findFirst({
            where: { id: vehicleId, tenantId: tenant.id },
            select: {
                fobPrice: true,
                year: true,
                make: true,
                model: true,
                stockNumber: true
            },
        });
        if (!vehicle) console.error("Vehicle not found or mismatch:", vehicleId);

        // 3. Get Port & Country
        const port = await prisma.exportPort.findFirst({
            where: { id: portId, tenantId: tenant.id },
            include: {
                country: true
            }
        });
        if (!port) console.error("Port not found or mismatch:", portId);

        if (!vehicle || !port) {
            return NextResponse.json({ error: "Invalid vehicle or port" }, { status: 400 });
        }

        // 4. Calculate Snapshot
        const fob = new Decimal(vehicle.fobPrice);
        let shipping = new Decimal(0);
        let insurance = new Decimal(0);
        let inspection = new Decimal(0);
        let askForPrice = false;

        if (port.shippingCost === null) askForPrice = true;
        else shipping = new Decimal(port.shippingCost);

        if (port.insuranceCost !== null) insurance = new Decimal(port.insuranceCost);
        if (port.inspectionFee !== null) inspection = new Decimal(port.inspectionFee);

        const cif = askForPrice ? null : fob.plus(shipping).plus(insurance).plus(inspection);

        // 5. Create Quote Request
        const quote = await prisma.exportQuoteRequest.create({
            data: {
                tenantId: tenant.id,
                vehicleId,
                customerId: customerId || null,
                name,
                email,
                phone,
                address,
                countryId,
                portId,

                // Snapshot
                fobPrice: fob,
                shippingCost: port.shippingCost ? shipping : null,
                insuranceCost: port.insuranceCost ? insurance : null,
                inspectionFee: port.inspectionFee ? inspection : null,
                totalCIF: cif,
                askForPrice,

                status: "PENDING"
            },
        });

        // 6. Send confirmation email
        await sendQuoteConfirmation(email, {
            name,
            vehicle: {
                year: vehicle.year,
                make: vehicle.make,
                model: vehicle.model,
                stockNumber: vehicle.stockNumber
            },
            country: { name: port.country.name },
            port: { name: port.name },
            totalCIF: cif ? cif.toNumber() : null
        }, tenant.id);

        return NextResponse.json({ success: true, quoteId: quote.id });

    } catch (error) {
        console.error("Failed to submit quote request:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
