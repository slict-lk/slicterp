'use client';

import { useMemo, useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAIExperience } from '@/components/ai/ai-experience-context';

type ModuleCopilotPanelProps = {
  module: 'crm' | 'accounting' | 'spareparts' | 'real-estate' | 'restaurant' | 'vehicle-export' | 'intelligence';
  title: string;
  description: string;
  context: Record<string, unknown>;
  suggestions?: string[];
};

export function ModuleCopilotPanel({
  module,
  title,
  description,
  context,
  suggestions = [],
}: ModuleCopilotPanelProps) {
    const { canUseAdvanced } = useAIExperience();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [functionCalls, setFunctionCalls] = useState<any[]>([]);
  const promptChips =
    suggestions.length > 0 ? suggestions : ['Summarize priorities', 'Show risks', 'Recommend next step'];

  const contextTags = useMemo(
    () =>
      Object.entries(context)
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.length : String(value ?? 'n/a')}`),
    [context]
  );

  const askCopilot = async (message: string) => {
    if (!message.trim()) {
      return;
    }

    setLoading(true);

    try {
      const result = await fetch('/api/ai/copilots/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module,
          message,
          context,
        }),
      });

      if (!result.ok) {
        const body = await result.json().catch(() => ({ error: 'Copilot request failed' }));
        throw new Error(body.error || 'Copilot request failed');
      }

      const data = await result.json();
      setResponse(data.response || '');
      setFunctionCalls(Array.isArray(data.functionCalls) ? data.functionCalls : []);
      setInput(message);
    } catch (error: any) {
      toast.error('Copilot failed', { description: error.message || 'Failed to get copilot response' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-sm">
      <CardHeader className="border-b border-slate-200/80 bg-slate-50/80">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <Bot className="h-4 w-4 text-sky-600" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Copilot
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {contextTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-mono text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-[110px]"
          placeholder="Ask for a summary, next step, or risk review."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => askCopilot(input)} disabled={loading || !input.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              'Ask Copilot'
            )}
          </Button>
          {promptChips.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              onClick={() => askCopilot(suggestion)}
              disabled={loading}
            >
              {suggestion}
            </Button>
          ))}
        </div>
        {response ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="whitespace-pre-wrap text-sm text-slate-800">{response}</p>
            {functionCalls.length > 0 && canUseAdvanced ? (
              <p className="mt-3 text-xs text-slate-500">
                Used {functionCalls.length} tool call{functionCalls.length > 1 ? 's' : ''}.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
