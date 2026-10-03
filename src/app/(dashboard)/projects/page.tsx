"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Briefcase, CheckCircle2, Clock3, FolderKanban, Plus, RefreshCw, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Project = { id: string; code: string; name: string; description?: string; status: string; templateKey: string; budget?: number; currency: string; updatedAt: string; tasks: Array<{ status: string }>; _count: { tasks: number; members: number; milestones: number } };
type Template = { key: string; name: string; description: string; category: string };
type WorkItem = { id: string; title: string; type: string; status: string; priority: string; dueDate?: string; project: { name: string; code: string } };
type Overview = { projects: Project[]; tasks: WorkItem[]; metrics: { activeProjects: number; totalProjects: number; openWorkItems: number; overdueWorkItems: number; completedWorkItems: number; teamMembers: number; totalBudget: number; trackedHours: number } };

const emptyForm = { name: '', code: '', description: '', templateKey: 'GENERAL', visibility: 'PRIVATE', status: 'PLANNING', currency: 'LKR', budget: '' };

export default function ProjectsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [templateSelectionApplied, setTemplateSelectionApplied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, templatesRes] = await Promise.all([fetch('/api/projects/overview'), fetch('/api/projects/templates')]);
      if (!overviewRes.ok) throw new Error((await overviewRes.json()).error || 'Unable to load projects');
      setOverview((await overviewRes.json()).data);
      if (templatesRes.ok) setTemplates((await templatesRes.json()).data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (templateSelectionApplied || !templates.length) return;
    const params = new URLSearchParams(window.location.search);
    const templateKey = params.get('templateKey');
    if (templateKey && templates.some((template) => template.key === templateKey)) {
      setForm((current) => ({ ...current, templateKey }));
      setOpen(true);
    } else if (params.get('create') === 'true') setOpen(true);
    setTemplateSelectionApplied(true);
  }, [templates, templateSelectionApplied]);

  async function createProject() {
    setSaving(true);
    try {
      const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, budget: form.budget ? Number(form.budget) : null }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to create project');
      toast.success('Project created');
      setOpen(false);
      setForm(emptyForm);
      router.push(`/projects/${body.data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  const recent = useMemo(() => overview?.tasks.slice(0, 6) ?? [], [overview]);
  const metrics = overview?.metrics;

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Work Management</p>
          <h1 className="text-3xl font-bold text-gray-950">Projects control center</h1>
          <p className="mt-1 text-gray-600">Plan delivery, coordinate teams, and keep every commitment visible.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh projects"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New project</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create a project</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2 md:grid-cols-2">
                <Field label="Project name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ERP 2026 delivery" /></Field>
                <Field label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ERP-2026" /></Field>
                <div className="md:col-span-2"><Field label="Template"><Select value={form.templateKey} onValueChange={(value) => setForm({ ...form, templateKey: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.key} value={template.key}>{template.name} · {template.category}</SelectItem>)}</SelectContent></Select></Field></div>
                <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What success looks like and what the team will deliver." /></Field></div>
                <Field label="Visibility"><Select value={form.visibility} onValueChange={(value) => setForm({ ...form, visibility: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRIVATE">Private to members</SelectItem><SelectItem value="TENANT">Visible to tenant</SelectItem></SelectContent></Select></Field>
                <Field label="Budget"><Input type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="0.00" /></Field>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={createProject} disabled={saving || form.name.trim().length < 2}>{saving ? 'Creating...' : 'Create project'}</Button></div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Active projects" value={metrics?.activeProjects ?? 0} detail={`${metrics?.totalProjects ?? 0} total`} icon={Briefcase} tone="blue" />
        <Metric title="Open work" value={metrics?.openWorkItems ?? 0} detail={`${metrics?.completedWorkItems ?? 0} completed`} icon={FolderKanban} tone="violet" />
        <Metric title="Overdue" value={metrics?.overdueWorkItems ?? 0} detail="Needs attention" icon={AlertTriangle} tone="red" />
        <Metric title="Tracked hours" value={metrics?.trackedHours ?? 0} detail={`${metrics?.teamMembers ?? 0} memberships`} icon={Clock3} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Project portfolio</h2><p className="text-sm text-gray-500">Current delivery health across the tenant.</p></div><Link href="/projects/tasks"><Button variant="outline">All work items<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>
          <div className="grid gap-3 md:grid-cols-2">
            {loading ? <SkeletonRows /> : overview?.projects.length ? overview.projects.map((project) => <ProjectCard key={project.id} project={project} />) : <Empty title="No projects yet" detail="Create a project from a template to start coordinating work." />}
          </div>
        </section>
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Priority work</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.length ? recent.map((item) => <Link key={item.id} href={`/projects/tasks/${item.id}`} className="block rounded-md border p-3 transition-colors hover:bg-gray-50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-gray-500">{item.project.code} · {item.type}</p></div><Badge variant={item.priority === 'URGENT' ? 'destructive' : 'outline'}>{item.priority}</Badge></div></Link>) : <p className="py-8 text-center text-sm text-gray-500">No work items yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Metric({ title, value, detail, icon: Icon, tone }: { title: string; value: number; detail: string; icon: typeof Briefcase; tone: string }) {
  const tones: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', violet: 'bg-violet-50 text-violet-700', red: 'bg-red-50 text-red-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-gray-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="text-xs text-gray-500">{detail}</p></div><div className={`rounded-md p-3 ${tones[tone]}`}><Icon className="h-5 w-5" /></div></CardContent></Card>;
}
function ProjectCard({ project }: { project: Project }) {
  const progress = project.tasks.length ? Math.round(project.tasks.filter((task) => task.status === 'DONE').length / project.tasks.length * 100) : 0;
  return <Link href={`/projects/${project.id}`}><Card className="h-full transition-all hover:border-blue-300 hover:shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-blue-600">{project.code}</p><h3 className="mt-1 font-semibold">{project.name}</h3><p className="mt-1 line-clamp-2 text-sm text-gray-500">{project.description || 'No description provided.'}</p></div><Badge variant="outline">{project.status.replaceAll('_', ' ')}</Badge></div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-blue-600" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex gap-4 text-xs text-gray-500"><span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{project._count.tasks} items</span><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project._count.members} members</span><span>{project.templateKey.replaceAll('_', ' ')}</span></div></CardContent></Card></Link>;
}
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="col-span-full rounded-md border border-dashed py-14 text-center"><FolderKanban className="mx-auto h-8 w-8 text-gray-300" /><p className="mt-3 font-medium">{title}</p><p className="mt-1 text-sm text-gray-500">{detail}</p></div>; }
function SkeletonRows() { return <>{[0, 1, 2, 3].map((n) => <div key={n} className="h-40 animate-pulse rounded-md bg-gray-100" />)}</>; }
