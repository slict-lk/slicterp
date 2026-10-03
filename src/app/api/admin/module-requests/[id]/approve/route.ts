import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || !session.user.isSuperAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const requestId = id;
    if (!requestId) {
      return new NextResponse("Request ID is required", { status: 400 });
    }

    // 1. Fetch the request
    const moduleRequest = await prisma.moduleAccessRequest.findUnique({
      where: { id: requestId },
      include: { tenant: true }
    });

    if (!moduleRequest) {
      return new NextResponse("Request not found", { status: 404 });
    }
    
    if (moduleRequest.status === "APPROVED") {
      return new NextResponse("Request already approved", { status: 400 });
    }

    // 2. Perform the update transactions
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Mark request as approved
      const updatedRequest = await tx.moduleAccessRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          processedById: session.user.id,
          processedAt: new Date(),
          adminNotes: "Approved by Super Admin",
        },
      });

      // 2b. Update the tenant's enabledModules list
      // Only push the module if it's not already in the array
      const currentModules = moduleRequest.tenant.enabledModules || [];
      if (!currentModules.includes(moduleRequest.moduleId)) {
        await tx.tenant.update({
          where: { id: moduleRequest.tenant.id },
          data: {
            enabledModules: [...currentModules, moduleRequest.moduleId],
          },
        });
      }

      // 2c. Send Notification to the customer (Tenant)
      await tx.notification.create({
         data: {
             userId: moduleRequest.requestedById,
             title: "Module Request Approved",
             message: `Your request for the ${moduleRequest.moduleId} module has been approved and is now active for your workspace.`,
             type: "SUCCESS",
             link: `/${moduleRequest.moduleId}`,
         }
      });

      return updatedRequest;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
