import { NextRequest, NextResponse } from 'next/server';
import { getProjectReports } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';

const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'export' });
    const report = await getProjectReports(await resolveProjectActor(user), request.nextUrl.searchParams.get('projectId') || undefined);
    const lines = [['Code', 'Project', 'Status', 'Budget', 'Currency'].map(csv).join(','), ...report.projects.map((project: any) => [project.code, project.name, project.status, project.budget, project.currency].map(csv).join(','))];
    return new NextResponse(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="project-portfolio.csv"' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: /Forbidden/.test(error.message) ? 403 : 500 });
  }
}
