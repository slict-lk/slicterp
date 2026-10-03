"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Plus, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Project = { id: string; code: string; name: string; description?: string; status: string; templateKey: string; budget?: number; currency: string; tasks: Array<{ status: string }>; _count: { tasks: number; members: number; milestones: number } };

export default function ProjectPortfolioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/overview');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load portfolio');
      setProjects(body.data.projects);
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => projects.filter((project) => (status === 'ALL' || project.status === status) && (!search || `${project.name} ${project.code}`.toLowerCase().includes(search.toLowerCase()))), [projects, search, status]);

  return <div className="space-y-6 p-6">
    <header className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Projects</p><h1 className="text-3xl font-bold">Portfolio</h1><p className="mt-1 text-gray-600">Choose a project to manage its plan, team, work, schedule, and delivery.</p></div><div className="flex gap-2"><Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh portfolio"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button><Button asChild><Link href="/projects?create=true"><Plus className="mr-2 h-4 w-4" />New project</Link></Button></div></header>
    <Card><CardContent className="flex flex-col gap-3 p-4 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search portfolio..." /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem>{['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></CardContent></Card>
    <div className="overflow-hidden rounded-md border bg-white">
      <div className="hidden grid-cols-[1.6fr_120px_1fr_120px_140px_40px] gap-4 border-b bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 lg:grid"><span>Project</span><span>Status</span><span>Progress</span><span>Team</span><span>Budget</span><span /></div>
      {visible.length ? visible.map((project) => { const progress = project.tasks.length ? Math.round(project.tasks.filter((task) => task.status === 'DONE').length / project.tasks.length * 100) : 0; return <Link href={`/projects/${project.id}`} key={project.id} className="grid gap-3 border-b p-4 transition-colors last:border-0 hover:bg-gray-50 lg:grid-cols-[1.6fr_120px_1fr_120px_140px_40px] lg:items-center lg:gap-4"><div className="flex gap-3"><div className="rounded-md bg-blue-50 p-2 text-blue-700"><BriefcaseBusiness className="h-5 w-5" /></div><div><p className="font-medium">{project.name}</p><p className="text-xs text-gray-500">{project.code} · {project.templateKey.replaceAll('_', ' ')}</p></div></div><Badge variant="outline" className="w-fit">{project.status.replaceAll('_', ' ')}</Badge><div><div className="mb-1 flex justify-between text-xs text-gray-500"><span>{project._count.tasks} items</span><span>{progress}%</span></div><Progress value={progress} /></div><span className="text-sm">{project._count.members} members</span><span className="text-sm font-medium">{project.budget ? `${project.currency} ${Number(project.budget).toLocaleString()}` : 'Not set'}</span><ArrowRight className="h-4 w-4 text-gray-400" /></Link>; }) : <p className="p-14 text-center text-sm text-gray-500">No projects match these filters.</p>}
    </div>
  </div>;
}
