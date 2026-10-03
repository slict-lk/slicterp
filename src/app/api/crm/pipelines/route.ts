import { NextRequest, NextResponse } from "next/server";
import { createPipeline, listPipelines } from "@/apps/crm/api";
import { requireTenantContext } from "@/lib/server/erp-context";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pipelineCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: "crm", action: "view" });
    const items = await listPipelines(tenantId);
    return NextResponse.json({ data: items, metadata: { count: items.length } });
  } catch (error: any) {
    const status = error?.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Failed to fetch pipelines" },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: "crm", action: "create" });
    const body = await request.json();

    // Strict schema parsing
    const parsedData = pipelineCreateSchema.parse(body);

    const item = await createPipeline(tenantId, parsedData);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    const status = error?.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Failed to create pipeline" },
      { status }
    );
  }
}
