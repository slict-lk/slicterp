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

        const countries = await prisma.exportCountry.findMany({
            where: { tenantId: user.tenantId },
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { ports: true },
                },
            },
        });

        return NextResponse.json(countries);
    } catch (error) {
        console.error("Failed to fetch countries:", error);
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

        const { name, code } = await req.json();

        if (!name || !code) {
            return NextResponse.json(
                { error: "Name and Code are required" },
                { status: 400 }
            );
        }

        const country = await prisma.exportCountry.create({
            data: {
                tenantId: user.tenantId,
                name,
                code: code.toUpperCase(),
                isActive: true,
            },
        });

        return NextResponse.json(country);
    } catch (error) {
        console.error("Failed to create country:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
