import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendQuotation } from "@/lib/email";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch Quote
        const quote = await prisma.exportQuoteRequest.findUnique({
            where: { id: id, tenantId: user.tenantId },
            include: {
                vehicle: true,
                country: true,
                port: true
            }
        });

        if (!quote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // 2. Generate Quote Link (Placeholder logic)
        // Ideally we fetch the tenant's primary domain
        const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId },
            select: { subdomain: true, domain: true, id: true }
        });

        // Construct link
        let quoteLink = "";

        if (tenant?.domain) {
            // If the tenant has a FULL custom domain (e.g., "www.alphamc.pro" or "alphamc.pro")
            const domain = tenant.domain.startsWith("http") ? tenant.domain : `https://${tenant.domain}`;
            quoteLink = `${domain}/vehicles/${quote.vehicleId}`;
        } else {
            // Fallback to path-based routing (Standard Slict Auto Format)
            // e.g., http://localhost:3001/alphamc/vehicles/...
            const baseDomain = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001";

            // Ensure no double slashes
            const baseUrl = baseDomain.endsWith('/') ? baseDomain.slice(0, -1) : baseDomain;

            quoteLink = `${baseUrl}/${tenant?.subdomain}/vehicles/${quote.vehicleId}`;
        }

        // 3. Send Email
        await sendQuotation(quote.email, {
            name: quote.name,
            vehicle: {
                year: quote.vehicle.year,
                make: quote.vehicle.make,
                model: quote.vehicle.model,
                stockNumber: quote.vehicle.stockNumber
            },
            quoteLink
        }, user.tenantId);

        // 4. Update Status to QUOTED
        await prisma.exportQuoteRequest.update({
            where: { id: id },
            data: { status: "QUOTED" }
        });

        return NextResponse.json({ success: true, message: "Quote sent successfully" });

    } catch (error) {
        console.error("Failed to send quote:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
