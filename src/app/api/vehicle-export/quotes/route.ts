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
        const status = searchParams.get("status");

        const whereClause: any = { tenantId: user.tenantId };
        if (status && status !== "ALL") {
            whereClause.status = status;
        }

        const quotes = await prisma.exportQuoteRequest.findMany({
            where: whereClause,
            include: {
                vehicle: {
                    select: {
                        id: true,
                        make: true,
                        model: true,
                        year: true,
                        stockNumber: true,
                        fobPrice: true,
                        photos: {
                            where: { isPublic: true },
                            take: 1,
                            select: { url: true },
                        },
                    },
                },
                country: { select: { name: true } },
                port: { select: { name: true, shippingMethod: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(quotes);
    } catch (error) {
        console.error("Failed to fetch quotes:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
