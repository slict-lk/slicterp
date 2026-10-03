import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const subdomain = searchParams.get("subdomain");

        if (!subdomain) {
            return NextResponse.json(
                { error: "Subdomain is required" },
                { status: 400 }
            );
        }

        // Resolve tenant ID from subdomain
        // Resolve tenant ID from subdomain
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

        const countries = await prisma.exportCountry.findMany({
            where: {
                tenantId: tenant.id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                code: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(countries);
    } catch (error) {
        console.error("Failed to fetch shipping countries:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
