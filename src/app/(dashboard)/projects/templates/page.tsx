"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Archive, Briefcase, Code2, Copy, Layers3, Pencil, Plus, RefreshCw, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { PROJECT_TEMPLATES } from '@/apps/projects/templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const itemTypes = ['TASK', 'TODO', 'BUG', 'ISSUE', 'FEATURE', 'REQUEST', 'RISK', 'APPROVAL'];
type WorkflowStatus = { key: string; name: string; category: string; color: string };
type Template = {
  id?: string; version?: number; isSystem?: boolean; key: string; name: string; description: string; category: string;
  config: { workItemTypes: string[]; workflow: WorkflowStatus[]; features: { sprints: boolean; budgets: boolean; timesheets: boolean } };
};
const builtInTemplates: Template[] = PROJECT_TEMPLATES.map((template) => ({ ...template, isSystem: true, config: template }));

export default function ProjectTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(builtInTemplates);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/templates');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load tenant templates');
      setTemplates(body.data?.length ? body.data : builtInTemplates);
    } catch (error: any) { toast.error(error.message); setTemplates(builtInTemplates); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function cloneTemplate(template: Template) {
    setSaving(true);
    try {
      const key = `CUSTOM_${Date.now().toString(36).toUpperCase()}`;
      const response = await fetch('/api/projects/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, name: `${template.name} Custom`, description: template.description, category: 'Custom', icon: 'Layers3', config: { ...template.config, key, name: `${template.name} Custom`, category: 'Custom', isSystem: false } }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to clone template');
      toast.success('Template cloned. Configure it before using it.');
      setEditing(body.data);
      await load();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  }

  async function updateTemplate(template: Template, archive = false) {
    if (!template.id || !template.version) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/templates/${template.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(archive ? { version: template.version, isActive: false } : { version: template.version, name: template.name, description: template.description, category: template.category, config: { ...template.config, key: template.key, name: template.name, description: template.description, category: template.category } }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to update template');
      toast.success(archive ? 'Template archived' : 'Template saved and ready to use');
      setEditing(null);
      await load();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  }

  function toggleType(type: string) {
    if (!editing) return;
    const current = editing.config.workItemTypes;
    const next = current.includes(type) ? current.filter((value) => value !== type) : [...current, type];
    setEditing({ ...editing, config: { ...editing.config, workItemTypes: next } });
  }

  return <div className="space-y-6 p-6">
    <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Projects</p><h1 className="text-3xl font-bold">Templates</h1><p className="mt-1 text-gray-600">Choose a starting point, or clone one to configure your own workflow.</p></div><Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh templates"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map((template) => <Card key={template.key}><CardContent className="p-5"><div className="flex items-start justify-between"><div className="rounded-md bg-blue-50 p-2 text-blue-700">{template.key === 'SOFTWARE' ? <Code2 className="h-5 w-5" /> : template.key === 'GENERAL' ? <Briefcase className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}</div><div className="flex gap-1"><Badge variant="outline">{template.category}</Badge><Badge variant={template.isSystem ? 'secondary' : 'outline'}>{template.isSystem ? 'Built-in' : 'Custom'}</Badge></div></div><h2 className="mt-4 font-semibold">{template.name}</h2><p className="mt-1 min-h-10 text-sm text-gray-500">{template.description}</p><div className="mt-4 flex min-h-12 flex-wrap content-start gap-1">{template.config.workItemTypes.map((type) => <Badge key={type} variant="secondary">{type}</Badge>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-gray-500">{template.config.features.sprints ? 'Sprints enabled' : 'Continuous delivery'}</p><div className="flex gap-1">{!template.isSystem && <Button size="icon" variant="ghost" title="Archive template" onClick={() => updateTemplate(template, true)}><Archive className="h-4 w-4" /></Button>}{!template.isSystem && <Button size="sm" variant="outline" onClick={() => setEditing(template)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}<Button size="sm" variant="outline" onClick={() => cloneTemplate(template)} disabled={saving}><Copy className="mr-1 h-3.5 w-3.5" />Clone</Button><Button size="sm" asChild><Link href={`/projects?templateKey=${encodeURIComponent(template.key)}`}><Rocket className="mr-1 h-3.5 w-3.5" />Use</Link></Button></div></div></CardContent></Card>)}</div>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Configure custom template</DialogTitle></DialogHeader>{editing && <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2"><Field label="Template name"><Input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></Field><Field label="Category"><Input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Description"><Textarea value={editing.description || ''} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></Field></div></div><section><h3 className="text-sm font-semibold">Allowed work-item types</h3><div className="mt-3 flex flex-wrap gap-2">{itemTypes.map((type) => <Button key={type} size="sm" variant={editing.config.workItemTypes.includes(type) ? 'default' : 'outline'} onClick={() => toggleType(type)}>{type}</Button>)}</div></section><section><h3 className="text-sm font-semibold">Features</h3><div className="mt-3 grid gap-3 md:grid-cols-3">{(['sprints', 'budgets', 'timesheets'] as const).map((feature) => <label key={feature} className="flex items-center justify-between rounded-md border p-3"><span className="capitalize">{feature}</span><Switch checked={editing.config.features[feature]} onCheckedChange={(checked) => setEditing({ ...editing, config: { ...editing.config, features: { ...editing.config.features, [feature]: checked } } })} /></label>)}</div></section><section><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Workflow stages</h3><p className="text-xs text-gray-500">These columns are created when a project uses this template.</p></div><Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, config: { ...editing.config, workflow: [...editing.config.workflow, { key: `STAGE_${editing.config.workflow.length + 1}`, name: 'New stage', category: 'IN_PROGRESS', color: '#2563eb' }] } })}><Plus className="mr-1 h-3.5 w-3.5" />Stage</Button></div><div className="mt-3 space-y-2">{editing.config.workflow.map((status, index) => <div key={`${status.key}-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_110px]"><Input value={status.name} onChange={(event) => { const workflow = [...editing.config.workflow]; workflow[index] = { ...status, name: event.target.value, key: event.target.value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_') || status.key }; setEditing({ ...editing, config: { ...editing.config, workflow } }); }} /><Input value={status.category} onChange={(event) => { const workflow = [...editing.config.workflow]; workflow[index] = { ...status, category: event.target.value.toUpperCase() }; setEditing({ ...editing, config: { ...editing.config, workflow } }); }} /><Input type="color" value={status.color} onChange={(event) => { const workflow = [...editing.config.workflow]; workflow[index] = { ...status, color: event.target.value }; setEditing({ ...editing, config: { ...editing.config, workflow } }); }} /></div>)}</div></section><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => updateTemplate(editing)} disabled={saving || editing.name.trim().length < 2 || !editing.config.workItemTypes.length || editing.config.workflow.length < 2}>{saving ? 'Saving...' : 'Save template'}</Button></div></div>}</DialogContent></Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
