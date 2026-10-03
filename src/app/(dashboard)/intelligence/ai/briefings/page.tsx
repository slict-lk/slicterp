'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IntelligenceAIOutputCard } from '@/components/intelligence/intelligence-ai-output-card';

type BriefingPayload = {
  success: boolean;
  data: {
    audience: string;
    timeRange: string;
    gated: boolean;
    content: string;
    confidence: number;
    freshness: { workforce: string | null };
    sourceSections: string[];
    warnings: string[];
  };
};

export default function IntelligenceAIBriefingsPage() {
  const [audience, setAudience] = useState('CEO');
  const [timeRange, setTimeRange] = useState('current');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<BriefingPayload['data'] | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/ai/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, timeRange }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to generate briefing.');
      }
      setBriefing(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Briefings</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Generate audience-specific executive briefings using the shared AI backend over grounded intelligence context.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Briefing Controls</CardTitle>
          <CardDescription>Choose the audience and period framing before generating the briefing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CEO">CEO</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="OPERATIONS">Operations</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={generate} disabled={loading}>
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Generating' : 'Generate Briefing'}
          </Button>
        </CardContent>
      </Card>

      {briefing ? (
        <IntelligenceAIOutputCard
          title={`${briefing.audience} briefing`}
          description={`Time range: ${briefing.timeRange}`}
          content={briefing.content}
          confidence={briefing.confidence}
          freshness={briefing.freshness.workforce}
          sourceSections={briefing.sourceSections}
          warnings={briefing.warnings}
        />
      ) : null}
    </div>
  );
}
