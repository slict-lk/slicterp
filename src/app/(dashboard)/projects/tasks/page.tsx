"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Bug, CheckSquare2, CircleDot, Filter, Lightbulb, ListTodo, Plus, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type WorkflowStatus = { key: string; name: string; category: string; isDefault?: boolean };
type Project = { id: string; name: string; code: string; workflowStatuses?: WorkflowStatus[]; templateSnapshot?: { workItemTypes?: string[] } };
type Item = { id: string; title: string; description?: string; type: string; status: string; workflowStatusKey?: string; priority: string; severity?: string; dueDate?: string; version: number; sequenceNumber?: number; project: Project; _count: { comments: number; checklists: number; attachments: number } };

const defaultStatuses: WorkflowStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((key, index) => ({ key, name: key.replaceAll('_', ' '), category: key, isDefault: index === 0 }));
const defaultTypes = ['TASK', 'TODO', 'BUG', 'ISSUE', 'FEATURE', 'REQUEST', 'RISK', 'APPROVAL'];
const emptyForm = { projectId: '', title: '', description: '', type: 'TASK', priority: 'MEDIUM', severity: '', dueDate: '' };

export default function WorkItemsPage() {
  const searchParams = useSearchParams();
  const scopedProjectId = searchParams.get('projectId') || '';
  const createRequested = searchParams.get('create') === 'true';
  const queryApplied = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scopedProject, setScopedProject] = useState<Project | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [view, setView] = useState<'BOARD' | 'LIST'>('BOARD');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const query = scopedProjectId ? `?projectId=${encodeURIComponent(scopedProjectId)}` : '';
    const [itemsRes, projectsRes, projectRes] = await Promise.all([
      fetch(`/api/projects/work-items${query}`),
      fetch('/api/projects'),
      scopedProjectId ? fetch(`/api/projects/${scopedProjectId}`) : Promise.resolve(null),
    ]);
    if (itemsRes.ok) setItems((await itemsRes.json()).data || []);
    if (projectsRes.ok) setProjects((await projectsRes.json()).data || []);
    if (projectRes?.ok) setScopedProject((await projectRes.json()).data);
    if (!scopedProjectId) setScopedProject(null);
  }, [scopedProjectId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (queryApplied.current) return;
    if (scopedProjectId) setForm((current) => ({ ...current, projectId: scopedProjectId }));
    if (createRequested) setOpen(true);
    queryApplied.current = true;
  }, [scopedProjectId, createRequested]);

  const workflow = scopedProject?.workflowStatuses?.length ? scopedProject.workflowStatuses : defaultStatuses;
  const workTypes = scopedProject?.templateSnapshot?.workItemTypes?.length ? scopedProject.templateSnapshot.workItemTypes : defaultTypes;
  const visible = useMemo(() => items.filter((item) => (type === 'ALL' || item.type === type) && (!search || `${item.title} ${item.project.name}`.toLowerCase().includes(search.toLowerCase()))), [items, type, search]);

  async function createItem() {
    setSaving(true);
    try {
      const defaultStatus = workflow.find((status) => status.isDefault) || workflow[0];
      const response = await fetch('/api/projects/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: defaultStatus?.category || 'TODO',
          workflowStatusKey: defaultStatus?.key || 'TODO',
          severity: form.severity || null,
          dueDate: form.dueDate || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to create work item');
      toast.success('Work item created');
      setOpen(false);
      setForm({ ...emptyForm, projectId: scopedProjectId });
      await load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function move(item: Item, targetKey: string) {
    if ((item.workflowStatusKey || item.status) === targetKey) return;
    const previous = items;
    setItems(items.map((candidate) => candidate.id === item.id ? { ...candidate, workflowStatusKey: targetKey } : candidate));
    const response = await fetch(`/api/projects/work-items/${item.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetKey, rank: Date.now() }),
    });
    if (!response.ok) {
      setItems(previous);
      toast.error((await response.json()).error || 'Unable to move work item');
    } else await load();
  }

  function handleDragEnd(event: DragEndEvent) {
    const item = items.find((candidate) => candidate.id === event.active.id);
    const targetKey = String(event.over?.id || '');
    if (item && workflow.some((status) => status.key === targetKey)) void move(item, targetKey);
  }

  return <div className="space-y-5 p-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-blue-600">{scopedProject ? <Link href={`/projects/${scopedProject.id}`} className="hover:underline">{scopedProject.code} · {scopedProject.name}</Link> : 'Projects'}</p>
        <h1 className="text-3xl font-bold">{scopedProject ? 'Project work' : 'All work items'}</h1>
        <p className="mt-1 text-gray-600">{scopedProject ? 'Create, assign, and move this project through its workflow.' : 'Tasks, bugs, issues, requests, risks, approvals, and planned features.'}</p>
      </div>
      <div className="flex gap-2">
        {scopedProject && <Button variant="outline" asChild><Link href={`/projects/${scopedProject.id}`}>Back to project</Link></Button>}
        <Button variant="outline" size="icon" onClick={load} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add work</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create work item</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <Field label="Project"><Select value={form.projectId} onValueChange={(value) => setForm({ ...form, projectId: value })} disabled={Boolean(scopedProject)}><SelectTrigger><SelectValue placeholder="Choose project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.code} · {project.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Type"><Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{workTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
              <div className="md:col-span-2"><Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Describe the outcome or problem" /></Field></div>
              <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Context, acceptance criteria, or reproduction steps." /></Field></div>
              <Field label="Priority"><Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field>
              {['BUG', 'ISSUE', 'RISK'].includes(form.type) && <Field label="Severity"><Select value={form.severity} onValueChange={(value) => setForm({ ...form, severity: value })}><SelectTrigger><SelectValue placeholder="Set severity" /></SelectTrigger><SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>}
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={createItem} disabled={saving || !form.projectId || form.title.trim().length < 2}>{saving ? 'Creating...' : 'Create work item'}</Button></div>
          </DialogContent>
        </Dialog>
      </div>
    </header>

    <Card><CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input className="pl-9" placeholder="Search work items..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={type} onValueChange={setType}><SelectTrigger className="w-full lg:w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All types</SelectItem>{workTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><div className="flex rounded-md border p-1"><Button size="sm" variant={view === 'BOARD' ? 'secondary' : 'ghost'} onClick={() => setView('BOARD')}>Board</Button><Button size="sm" variant={view === 'LIST' ? 'secondary' : 'ghost'} onClick={() => setView('LIST')}>List</Button></div></CardContent></Card>

    {view === 'BOARD' ? <DndContext sensors={sensors} onDragEnd={handleDragEnd}><div className="grid gap-4 xl:grid-cols-4">{workflow.map((status) => <BoardColumn key={status.key} status={status} items={visible.filter((item) => (item.workflowStatusKey || item.status) === status.key)} />)}</div></DndContext> : <div className="overflow-hidden rounded-md border bg-white">{visible.length ? visible.map((item) => <WorkRow key={item.id} item={item} workflow={workflow} move={move} />) : <EmptyState scopedProject={scopedProject} openCreate={() => setOpen(true)} />}</div>}
  </div>;
}

function BoardColumn({ status, items }: { status: WorkflowStatus; items: Item[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.key });
  return <section ref={setNodeRef} className={`min-h-48 min-w-0 rounded-md border p-3 transition-colors ${isOver ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-gray-50'}`}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{status.name}</h2><Badge variant="secondary">{items.length}</Badge></div><div className="space-y-2">{items.length ? items.map((item) => <WorkCard key={item.id} item={item} />) : <p className="rounded-md border border-dashed p-6 text-center text-xs text-gray-500">Drop work here</p>}</div></section>;
}
function WorkCard({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  return <Card ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={`shadow-none ${isDragging ? 'z-50 opacity-70 shadow-lg' : ''}`}><CardContent className="p-3"><div className="flex items-start gap-2"><button type="button" className="cursor-grab rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label={`Move ${item.title}`} {...listeners} {...attributes}><TypeIcon type={item.type} /></button><div className="min-w-0 flex-1"><Link href={`/projects/tasks/${item.id}`} className="text-sm font-medium hover:text-blue-700">{item.title}</Link><p className="mt-1 text-xs text-gray-500">{item.project.code} · #{item.sequenceNumber}</p></div></div><div className="mt-3 flex items-center justify-between"><Badge variant={item.priority === 'URGENT' ? 'destructive' : 'outline'}>{item.priority}</Badge><span className="text-xs text-gray-400">Drag to move</span></div></CardContent></Card>;
}
function WorkRow({ item, workflow, move }: { item: Item; workflow: WorkflowStatus[]; move: (item: Item, status: string) => void }) {
  return <div className="flex flex-col gap-3 border-b p-4 last:border-0 lg:flex-row lg:items-center"><div className="flex flex-1 items-center gap-3"><TypeIcon type={item.type} /><div><Link href={`/projects/tasks/${item.id}`} className="font-medium hover:text-blue-700">{item.title}</Link><p className="text-xs text-gray-500">{item.project.code} · {item.type} #{item.sequenceNumber}</p></div></div><Badge variant="outline">{item.priority}</Badge><Select value={item.workflowStatusKey || item.status} onValueChange={(value) => move(item, value)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{workflow.map((status) => <SelectItem key={status.key} value={status.key}>{status.name}</SelectItem>)}</SelectContent></Select></div>;
}
function EmptyState({ scopedProject, openCreate }: { scopedProject: Project | null; openCreate: () => void }) {
  return <div className="p-12 text-center"><FolderIcon /><p className="mt-3 font-medium">{scopedProject ? 'No work has been added to this project yet.' : 'No work items found.'}</p><p className="mt-1 text-sm text-gray-500">{scopedProject ? 'Create the first task, bug, issue, request, or risk so the project becomes actionable.' : 'Create work inside a project or adjust your filters.'}</p>{scopedProject && <Button className="mt-4" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add first work item</Button>}</div>;
}
function TypeIcon({ type }: { type: string }) { const Icon = type === 'BUG' ? Bug : type === 'ISSUE' ? CircleDot : type === 'FEATURE' ? Lightbulb : type === 'RISK' ? AlertTriangle : type === 'TODO' ? ListTodo : CheckSquare2; return <div className="rounded bg-blue-50 p-1.5 text-blue-700"><Icon className="h-4 w-4" /></div>; }
function FolderIcon() { return <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700"><CheckSquare2 className="h-5 w-5" /></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
