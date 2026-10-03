import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const countryId = searchParams.get("countryId");

        if (!countryId) {
            return NextResponse.json(
                { error: "Country ID is required" },
                { status: 400 }
            );
        }

        const ports = await prisma.exportPort.findMany({
            where: {
                tenantId: user.tenantId,
                countryId,
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(ports);
    } catch (error) {
        console.error("Failed to fetch ports:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            countryId,
            name,
            shippingMethod,
            shippingCost,
            insuranceCost,
            inspectionFee,
            isDefault,
        } = body;

        const port = await prisma.exportPort.create({
            data: {
                tenantId: user.tenantId,
                countryId,
                name,
                shippingMethod,
                shippingCost: shippingCost || null,
                insuranceCost: insuranceCost || null,
                inspectionFee: inspectionFee || null,
                isDefault: isDefault || false,
            },
        });

        return NextResponse.json(port);
    } catch (error) {
        console.error("Failed to create port:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
