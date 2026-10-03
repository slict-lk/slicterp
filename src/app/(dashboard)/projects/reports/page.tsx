"use client";

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Reports = { projects: any[]; summary: any };

export default function ProjectReportsPage() {
  const [data, setData] = useState<Reports | null>(null);
  useEffect(() => { fetch('/api/projects/reports').then((response) => response.json()).then((body) => setData(body.data)); }, []);
  const summary = data?.summary || {};
  const completion = summary.openItems || summary.completedItems ? Math.round((summary.completedItems || 0) / ((summary.openItems || 0) + (summary.completedItems || 0)) * 100) : 0;
  const margin = Number(summary.revenue || 0) - Number(summary.cost || 0);
  return <div className="space-y-6 p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-blue-600">Projects</p><h1 className="text-3xl font-bold">Portfolio intelligence</h1><p className="mt-1 text-gray-600">Delivery, effort, quality, and profitability across authorized projects.</p></div><Button variant="outline" asChild><a href="/api/projects/reports/export"><Download className="mr-2 h-4 w-4" />Export CSV</a></Button></div>
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Completion" value={`${completion}%`} icon={CheckCircle2} /><Metric label="Open / overdue" value={`${summary.openItems || 0} / ${summary.overdueItems || 0}`} icon={AlertTriangle} /><Metric label="Tracked / billable hours" value={`${Number(summary.trackedHours || 0).toFixed(1)} / ${Number(summary.billableHours || 0).toFixed(1)}`} icon={Clock3} /><Metric label="Margin" value={margin.toLocaleString()} icon={BarChart3} /></div>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Portfolio health</CardTitle></CardHeader><CardContent className="space-y-5">{data?.projects.map((project) => <div key={project.id}><div className="mb-2 flex justify-between gap-3"><div><p className="font-medium">{project.name}</p><p className="text-xs text-gray-500">{project.code} · {project.status.replaceAll('_', ' ')}</p></div><span className="text-sm text-gray-500">{project.budget ? `${project.currency} ${Number(project.budget).toLocaleString()}` : 'No budget'}</span></div><Progress value={project.status === 'COMPLETED' ? 100 : project.status === 'IN_PROGRESS' ? 55 : 15} /></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Delivery signals</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3"><Signal label="Bugs" value={summary.bugs || 0} /><Signal label="Completed work" value={summary.completedItems || 0} /><Signal label="Milestones completed" value={`${summary.milestonesCompleted || 0}/${summary.milestonesTotal || 0}`} /><Signal label="Billable utilization" value={`${summary.trackedHours ? Math.round((summary.billableHours || 0) / summary.trackedHours * 100) : 0}%`} /></CardContent></Card></div>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Clock3 }) { return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-blue-600" /></CardContent></Card>; }
function Signal({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md border p-4"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
