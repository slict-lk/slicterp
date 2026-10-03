import { NextResponse } from "next/server";
import { AVAILABLE_MODULES } from "@/lib/modules-config";

export async function GET() {
  try {
    return NextResponse.json(AVAILABLE_MODULES);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
