'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IntelligenceAIOutputCard } from '@/components/intelligence/intelligence-ai-output-card';

type SeedPayload = {
  success: boolean;
  data: {
    options: {
      constraints: Array<{ id: string; label: string }>;
      employees: Array<{ id: string; label: string }>;
      trees: Array<{ id: string; label: string }>;
    };
  };
};

type ExplanationPayload = {
  success: boolean;
  data: {
    surface: string;
    entityType: string | null;
    entityId: string | null;
    content: string;
    confidence: number;
    freshness: { workforce: string | null };
    sourceSections: string[];
    warnings: string[];
  };
};

export default function IntelligenceAIExplanationsPage() {
  const [seed, setSeed] = useState<SeedPayload['data'] | null>(null);
  const [surface, setSurface] = useState('constraints');
  const [entityType, setEntityType] = useState<'constraint' | 'employee' | 'tree'>('constraint');
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplanationPayload['data'] | null>(null);

  async function loadSeed() {
    const response = await fetch('/api/intelligence/ai/explanations');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load explanation options.');
    }
    setSeed(payload.data);
    if (payload.data.options.constraints[0]) {
      setEntityId(payload.data.options.constraints[0].id);
    }
  }

  useEffect(() => {
    loadSeed()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!seed) return;
    const nextOptions =
      entityType === 'constraint'
        ? seed.options.constraints
        : entityType === 'employee'
          ? seed.options.employees
          : seed.options.trees;
    setEntityId(nextOptions[0]?.id ?? '');
  }, [entityType, seed]);

  async function explain() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/ai/explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface, entityType, entityId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to generate explanation.');
      }
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate explanation.');
    } finally {
      setRunning(false);
    }
  }

  const options =
    entityType === 'constraint'
      ? seed?.options.constraints ?? []
      : entityType === 'employee'
        ? seed?.options.employees ?? []
        : seed?.options.trees ?? [];

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">Loading explanation workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Explanations</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Ask the shared AI backend to explain a constraint, workforce profile, or TOC tree using only intelligence data.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Explanation Controls</CardTitle>
          <CardDescription>Pick the intelligence surface and target entity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Select value={surface} onValueChange={setSurface}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constraints">Constraints</SelectItem>
              <SelectItem value="workforce">Workforce</SelectItem>
              <SelectItem value="toc">TOC</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entityType} onValueChange={(value) => setEntityType(value as 'constraint' | 'employee' | 'tree')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constraint">Constraint</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="tree">Tree</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entityId} onValueChange={setEntityId}>
            <SelectTrigger>
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={explain} disabled={running}>
            {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            {running ? 'Explaining' : 'Explain'}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <IntelligenceAIOutputCard
          title="Grounded explanation"
          description={`${result.surface} · ${result.entityType ?? 'overview'}`}
          content={result.content}
          confidence={result.confidence}
          freshness={result.freshness.workforce}
          sourceSections={result.sourceSections}
          warnings={result.warnings}
        />
      ) : null}
    </div>
  );
}
