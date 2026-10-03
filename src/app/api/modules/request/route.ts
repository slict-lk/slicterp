import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { AVAILABLE_MODULES } from "@/lib/modules-config";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { moduleId, action = "ENABLE" } = await req.json();

    if (!moduleId) {
      return new NextResponse("Module ID is required", { status: 400 });
    }

    const moduleConfig = AVAILABLE_MODULES.find((m) => m.id === moduleId);
    if (!moduleConfig) {
      return new NextResponse("Invalid Module ID", { status: 400 });
    }

    // 1. Create the ModuleAccessRequest
    const request = await prisma.moduleAccessRequest.create({
      data: {
        tenantId: session.user.tenantId,
        requestedById: session.user.id,
        moduleId,
        action,
        status: "PENDING",
        reason: `Requested via initial Marketplace Flow for module: ${moduleConfig.name}. Wait for payment verification.`,
      },
    });

    // 2. Fetch all super admins to notify them
    const superAdmins = await prisma.user.findMany({
      where: {
        isSuperAdmin: true,
      },
    });

    // 3. Create notifications for Super Admins
    if (superAdmins.length > 0) {
      const notificationData = superAdmins.map((admin) => ({
        userId: admin.id,
        title: "New Module Request",
        message: `${session.user.name} from tenant ${session.user.tenantId} requested the ${moduleConfig.name} module.`,
        type: "ATTENTION",
        link: `/admin/module-requests`,
      }));

      await prisma.notification.createMany({
        data: notificationData,
      });
    }

    return NextResponse.json(request);
  } catch (error: any) {
    if (error.code === 'P2002') {
         return new NextResponse("A request for this module is already pending.", { status: 400 });
    }
    return new NextResponse(error.message, { status: 500 });
  }
}
