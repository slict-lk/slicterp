"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AIEmptyState, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { WorkflowTemplateRecord } from '@/lib/ai/control-plane-types';
import { joinList, parseList, readResponseError } from '@/components/ai/registry-manager-utils';

type TemplateFormState = {
  name: string;
  category: string;
  modules: string;
  safetyProfile: string;
  description: string;
};

const EMPTY_TEMPLATE: TemplateFormState = {
  name: '',
  category: '',
  modules: '',
  safetyProfile: 'approval_required',
  description: '',
};

function toFormState(template: WorkflowTemplateRecord): TemplateFormState {
  return {
    name: template.name,
    category: template.category,
    modules: joinList(template.modules),
    safetyProfile: template.safetyProfile,
    description: template.description,
  };
}

export function TemplatesManager({
  initialTemplates,
}: {
  initialTemplates: WorkflowTemplateRecord[];
}) {
  const router = useRouter();
    const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplates[0]?.id ?? null);
  const [form, setForm] = useState<TemplateFormState>(
    initialTemplates[0] ? toFormState(initialTemplates[0]) : EMPTY_TEMPLATE
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [templates, selectedId]
  );

  useEffect(() => {
    setForm(selectedTemplate ? toFormState(selectedTemplate) : EMPTY_TEMPLATE);
  }, [selectedTemplate]);

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_TEMPLATE);
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        modules: parseList(form.modules),
        safetyProfile: form.safetyProfile.trim(),
        description: form.description.trim(),
      };

      const response = await fetch(
        selectedId ? `/api/ai/templates/${selectedId}` : '/api/ai/templates',
        {
          method: selectedId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to save template'));
      }

      const nextTemplates = (await response.json()) as WorkflowTemplateRecord[];
      setTemplates(nextTemplates);
      if (!selectedId) {
        const created = nextTemplates.find((t) => t.name === payload.name);
        setSelectedId(created?.id ?? nextTemplates[nextTemplates.length - 1]?.id ?? null);
      }
      toast.success(selectedId ? 'Template updated' : 'Template created', { description: payload.name });
      router.refresh();
    } catch (error: any) {
      toast.error('Save failed', {description: error.message || 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selectedId || !selectedTemplate) {
      return;
    }

    if (!window.confirm(`Delete template "${selectedTemplate.name}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/ai/templates/${selectedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete template'));
      }

      const nextTemplates = (await response.json()) as WorkflowTemplateRecord[];
      setTemplates(nextTemplates);
      setSelectedId(nextTemplates[0]?.id ?? null);
      toast.success('Template deleted', { description: selectedTemplate.name, });
      router.refresh();
    } catch (error: any) {
      toast.error('Delete failed', {description: error.message || 'Failed to delete template' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <AISectionCard
        title="Template Catalog"
        description="Reusable workflow blueprints published into the tenant’s automation catalog."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={startCreate}>
              New Template
            </Button>
            <Button asChild variant="outline">
              <Link href="/ai/workflows/new">Use in Workflow</Link>
            </Button>
          </div>
        }
      >
        {templates.length === 0 ? (
          <AIEmptyState
            title="No templates published"
            description="Publish reusable workflow definitions here so rollout teams can start from governed blueprints instead of rebuilding common flows."
            action={
              <Button type="button" onClick={startCreate}>
                Publish Template
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Safety</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{template.name}</p>
                      <p className="text-sm text-slate-600">{template.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{template.category}</TableCell>
                  <TableCell>{template.modules.join(', ')}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={template.safetyProfile} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(template.id)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AISectionCard>

      <AISectionCard
        title={selectedTemplate ? 'Edit Template' : 'Publish Template'}
        description="Catalog entries stay dynamic and tenant-scoped, so rollout teams can evolve blueprint coverage over time."
      >
        <form className="space-y-5" onSubmit={saveTemplate}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Invoice Reminder Orchestration"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-category">Category</Label>
              <Input
                id="template-category"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="collections"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-modules">Compatible modules</Label>
            <Textarea
              id="template-modules"
              value={form.modules}
              onChange={(event) => setForm((current) => ({ ...current, modules: event.target.value }))}
              className="min-h-[90px]"
              placeholder="crm, accounting"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-safety-profile">Safety profile</Label>
            <Input
              id="template-safety-profile"
              value={form.safetyProfile}
              onChange={(event) =>
                setForm((current) => ({ ...current, safetyProfile: event.target.value }))
              }
              placeholder="approval_required"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-[120px]"
              placeholder="Describe the trigger, safety profile, and intended rollout use case."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedTemplate ? 'Save Template' : 'Publish Template'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(selectedTemplate ? toFormState(selectedTemplate) : EMPTY_TEMPLATE)}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteTemplate}
              disabled={!selectedTemplate || deleting || saving}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </AISectionCard>
    </div>
  );
}
