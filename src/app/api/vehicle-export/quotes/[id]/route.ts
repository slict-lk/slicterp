import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const quote = await prisma.exportQuoteRequest.findUnique({
            where: { id: id, tenantId: user.tenantId },
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
                country: true,
                port: true,
                customer: {
                    select: { id: true, name: true, email: true, phone: true },
                },
            },
        });

        if (!quote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        return NextResponse.json(quote);
    } catch (error) {
        console.error("Failed to fetch quote detail:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { status, adminNotes } = body;

        const quote = await prisma.exportQuoteRequest.update({
            where: { id: id, tenantId: user.tenantId },
            data: {
                status,
                adminNotes,
            },
        });

        return NextResponse.json(quote);
    } catch (error) {
        console.error("Failed to update quote:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
