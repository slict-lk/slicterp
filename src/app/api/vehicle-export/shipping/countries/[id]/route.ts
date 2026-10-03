import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

        const { name, code, isActive } = await req.json();

        const country = await prisma.exportCountry.update({
            where: { id: id, tenantId: user.tenantId },
            data: {
                name,
                code: code ? code.toUpperCase() : undefined,
                isActive,
            },
        });

        return NextResponse.json(country);
    } catch (error) {
        console.error("Failed to update country:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.exportCountry.delete({
            where: { id: id, tenantId: user.tenantId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete country:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
