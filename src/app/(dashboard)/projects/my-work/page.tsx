"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Briefcase, CalendarClock, CheckCircle2, CircleDot, FolderKanban, RefreshCw, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Item = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  dueDate?: string;
  sequenceNumber?: number;
  project: { name: string; code: string };
};
type ResponseData = { items: Item[]; metrics: { open: number; overdue: number; dueToday: number; completed: number } };

export default function MyWorkPage() {
  const [data, setData] = useState<ResponseData>({ items: [], metrics: { open: 0, overdue: 0, dueToday: 0, completed: 0 } });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/my-work');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load your work');
      setData(body.data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const groups = useMemo(() => ({
    priority: data.items.filter((item) => !['DONE', 'CANCELLED'].includes(item.status) && (item.priority === 'URGENT' || item.priority === 'HIGH')),
    due: data.items.filter((item) => !['DONE', 'CANCELLED'].includes(item.status) && item.dueDate && new Date(item.dueDate) < tomorrow),
    open: data.items.filter((item) => !['DONE', 'CANCELLED'].includes(item.status)),
    completed: data.items.filter((item) => item.status === 'DONE'),
  }), [data, tomorrow]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Projects</p>
          <h1 className="text-3xl font-bold">My Work</h1>
          <p className="mt-1 text-gray-600">Everything assigned to you across projects, ordered by urgency.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/projects/portfolio"><Briefcase className="mr-2 h-4 w-4" />Portfolio</Link></Button>
          <Button variant="outline" asChild><Link href="/projects/tasks"><FolderKanban className="mr-2 h-4 w-4" />All work</Link></Button>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh your work"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open" value={data.metrics.open} icon={CircleDot} />
        <Metric label="Overdue" value={data.metrics.overdue} icon={AlertTriangle} tone="red" />
        <Metric label="Due today" value={data.metrics.dueToday} icon={CalendarClock} tone="amber" />
        <Metric label="Completed" value={data.metrics.completed} icon={CheckCircle2} tone="emerald" />
      </div>

      <Tabs defaultValue="focus">
        <TabsList><TabsTrigger value="focus">Focus</TabsTrigger><TabsTrigger value="all">All open</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger></TabsList>
        <TabsContent value="focus" className="grid gap-5 pt-3 xl:grid-cols-2">
          {!loading && data.items.length === 0 && <div className="xl:col-span-2"><NoAssignedWork /></div>}
          <WorkSection title="High priority" items={groups.priority} empty="No urgent or high-priority work assigned." />
          <WorkSection title="Due and overdue" items={groups.due} empty="Nothing due today or overdue." />
        </TabsContent>
        <TabsContent value="all" className="pt-3"><WorkSection title="All assigned work" items={groups.open} empty="No open work is assigned to you." /></TabsContent>
        <TabsContent value="completed" className="pt-3"><WorkSection title="Recently completed" items={groups.completed} empty="No completed work yet." /></TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'blue' }: { label: string; value: number; icon: typeof CircleDot; tone?: string }) {
  const tones: Record<string, string> = { blue: 'text-blue-600', red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-600' };
  return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className={`h-5 w-5 ${tones[tone]}`} /></CardContent></Card>;
}
function NoAssignedWork() {
  return <Card className="border-dashed"><CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">No work is assigned to you yet</p><p className="mt-1 text-sm text-gray-500">Create a project work item, assign it to yourself or another team member, and it will appear here as the personal execution queue.</p></div><div className="flex gap-2"><Button variant="outline" asChild><Link href="/projects/portfolio">Open portfolio</Link></Button><Button asChild><Link href="/projects/tasks">Go to work items</Link></Button></div></CardContent></Card>;
}
function WorkSection({ title, items, empty }: { title: string; items: Item[]; empty: string }) {
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="divide-y p-0">{items.length ? items.map((item) => <Link key={item.id} href={`/projects/tasks/${item.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-gray-50"><UserRoundCheck className="h-4 w-4 text-blue-600" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.title}</p><p className="text-xs text-gray-500">{item.project.code} · {item.type} #{item.sequenceNumber}</p></div><div className="text-right"><Badge variant={item.priority === 'URGENT' ? 'destructive' : 'outline'}>{item.priority}</Badge><p className="mt-1 text-xs text-gray-500">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}</p></div></Link>) : <p className="p-10 text-center text-sm text-gray-500">{empty}</p>}</CardContent></Card>;
}
