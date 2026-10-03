import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const wfs = await prisma.studioWorkflow.findMany({ select: { id: true, triggerType: true, triggerConfig: true, isActive: true } });
  return NextResponse.json(wfs);
}
