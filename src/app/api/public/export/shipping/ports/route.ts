import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const subdomain = searchParams.get("subdomain");
        const countryId = searchParams.get("countryId");

        if (!subdomain) {
            return NextResponse.json(
                { error: "Subdomain is required" },
                { status: 400 }
            );
        }

        if (!countryId) {
            return NextResponse.json(
                { error: "Country ID is required" },
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

        const ports = await prisma.exportPort.findMany({
            where: {
                tenantId: tenant.id,
                countryId: countryId,
            },
            select: {
                id: true,
                name: true,
                shippingMethod: true,
                shippingCost: true,
                insuranceCost: true,
                inspectionFee: true,
                isDefault: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(ports);
    } catch (error) {
        console.error("Failed to fetch shipping ports:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
