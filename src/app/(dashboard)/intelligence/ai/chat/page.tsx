'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfidenceBadge } from '@/components/intelligence/confidence-badge';
import { DataFreshnessStamp } from '@/components/intelligence/data-freshness-stamp';

type ChatPayload = {
  success: boolean;
  data: {
    focus: string;
    gated: boolean;
    content: string;
    confidence: number;
    freshness: { workforce: string | null };
    sourceSections: string[];
    warnings: string[];
  };
};

type ContextPayload = {
  success: boolean;
  data: {
    context: {
      suggestedPrompts: string[];
      gated: boolean;
    };
  };
};

export default function IntelligenceAIChatPage() {
  const [focus, setFocus] = useState('overview');
  const [audience, setAudience] = useState('CEO');
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [response, setResponse] = useState<ChatPayload['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/intelligence/ai/context')
      .then((result) => result.json())
      .then((payload: ContextPayload) => {
        if (payload?.success) {
          setSuggestions(payload.data.context.suggestedPrompts);
        }
      })
      .catch(() => undefined);
  }, []);

  async function submit(message: string) {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, focus, audience }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to get AI response.');
      }
      setResponse(payload.data);
      setInput(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response.');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Chat</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          This chat uses the same AI backend family as the rest of the product, but it is grounded only in intelligence context.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-600" />
              Chat Controls
            </CardTitle>
            <CardDescription>Choose focus and audience, then ask about readiness, workforce, constraints, TOC, or recommendations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="readiness">Readiness</SelectItem>
                <SelectItem value="workforce">Workforce</SelectItem>
                <SelectItem value="constraints">Constraints</SelectItem>
                <SelectItem value="toc">TOC</SelectItem>
                <SelectItem value="recommendations">Recommendations</SelectItem>
              </SelectContent>
            </Select>

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

            <form onSubmit={onSubmit} className="space-y-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-h-[140px]"
                placeholder="Ask for an executive summary, explain a bottleneck, or interpret a current risk."
              />
              <Button type="submit" disabled={loading || !input.trim()} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                {loading ? 'Thinking...' : 'Ask Intelligence AI'}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  onClick={() => submit(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  AI Response
                </CardTitle>
                <CardDescription>Every answer is scoped to intelligence data and should surface uncertainty when confidence is weak.</CardDescription>
              </div>
              {typeof response?.confidence === 'number' ? <ConfidenceBadge value={response.confidence} /> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="min-h-[220px] rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {response?.content ?? 'Your grounded intelligence answer will appear here.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(response?.sourceSections ?? []).map((section) => (
                  <Badge key={section} variant="secondary">
                    {section}
                  </Badge>
                ))}
              </div>
              <DataFreshnessStamp value={response?.freshness.workforce ?? null} />
            </div>
            {(response?.warnings ?? []).length ? (
              <div className="space-y-2">
                {response?.warnings.map((warning) => (
                  <div key={warning} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
