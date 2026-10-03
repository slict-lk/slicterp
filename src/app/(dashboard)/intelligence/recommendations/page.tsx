'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCheck, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ConfidenceBadge } from '@/components/intelligence/confidence-badge';
import { IntelligenceAIOutputCard } from '@/components/intelligence/intelligence-ai-output-card';

type Recommendation = {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'DRAFT' | 'NEEDS_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'IMPLEMENTED' | 'ARCHIVED';
  confidence: number;
  ownerSuggestion: string;
  evidence: string[];
  actions: string[];
  linkedProcessKey: string | null;
  type: string;
  governance: {
    status: 'DRAFT' | 'NEEDS_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'IMPLEMENTED' | 'ARCHIVED';
    note?: string;
    reviewedAt?: string;
    reviewedByUserId?: string;
  } | null;
};

type RecommendationsResponse = {
  success: boolean;
  data: {
    readinessStatus: string;
    recommendations: Recommendation[];
  };
};

const statusOrder = ['ALL', 'DRAFT', 'NEEDS_REVIEW', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED', 'ARCHIVED'] as const;

function urgencyTone(urgency: string) {
  if (urgency === 'CRITICAL') return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
  if (urgency === 'HIGH') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  return 'bg-sky-100 text-sky-700 hover:bg-sky-100';
}

export default function IntelligenceRecommendationsPage() {
  const [data, setData] = useState<RecommendationsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<(typeof statusOrder)[number]>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [governanceNote, setGovernanceNote] = useState('');
  const [draft, setDraft] = useState<{
    content: string;
    confidence: number;
    freshness: { workforce: string | null };
    sourceSections: string[];
    warnings: string[];
  } | null>(null);

  async function loadRecommendations() {
    const response = await fetch('/api/intelligence/recommendations');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load recommendations.');
    }
    setData(payload.data);
    if (!selectedId && payload.data.recommendations[0]) {
      setSelectedId(payload.data.recommendations[0].id);
    }
  }

  useEffect(() => {
    loadRecommendations()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredRecommendations = useMemo(() => {
    const source = data?.recommendations ?? [];
    if (activeStatus === 'ALL') return source;
    return source.filter((recommendation) => recommendation.status === activeStatus);
  }, [activeStatus, data]);

  const selectedRecommendation =
    filteredRecommendations.find((recommendation) => recommendation.id === selectedId) ??
    data?.recommendations.find((recommendation) => recommendation.id === selectedId) ??
    null;

  useEffect(() => {
    setGovernanceNote(selectedRecommendation?.governance?.note ?? '');
  }, [selectedRecommendation?.id, selectedRecommendation?.governance?.note]);

  async function updateStatus(recommendationId: string, status: Recommendation['status']) {
    setSavingId(recommendationId);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, status, note: governanceNote }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to update recommendation status.');
      }
      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recommendation status.');
    } finally {
      setSavingId(null);
    }
  }

  async function loadDraft(recommendationId: string) {
    setDraftLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/ai/recommendations/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to generate AI draft.');
      }
      setDraft(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI draft.');
    } finally {
      setDraftLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading AI advisory inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Advisory Inbox</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Recommendations stay grounded in audited constraints. Governance status lives beside the advice so nothing quietly slips into execution.
          </p>
        </div>
        <Button variant="outline" onClick={() => loadRecommendations().catch((err) => setError(err.message))}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Inbox
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Readiness gate</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{data?.readinessStatus ?? 'BLOCKED'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Recommendations</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{data?.recommendations.length ?? 0}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Needs review</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{data?.recommendations.filter((item) => item.status === 'NEEDS_REVIEW').length ?? 0}</p>
          </div>
          <div className="flex items-end justify-start md:justify-end">
            <Badge variant="outline" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Human review protected
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {statusOrder.map((status) => (
          <Button
            key={status}
            variant={activeStatus === status ? 'default' : 'outline'}
            onClick={() => setActiveStatus(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Strategy Inbox
            </CardTitle>
            <CardDescription>Email-style queue of advisory items awaiting leadership action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredRecommendations.map((recommendation) => (
              <button
                key={recommendation.id}
                type="button"
                onClick={() => setSelectedId(recommendation.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedRecommendation?.id === recommendation.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={urgencyTone(recommendation.urgency)}>{recommendation.urgency}</Badge>
                    <Badge variant="outline">{recommendation.status}</Badge>
                  </div>
                  <ConfidenceBadge value={recommendation.confidence} />
                </div>
                <p className="mt-3 font-semibold text-slate-950">{recommendation.title}</p>
                <p className="mt-1 text-sm text-slate-600">{recommendation.summary}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>{selectedRecommendation?.title ?? 'Select a recommendation'}</CardTitle>
              <CardDescription>{selectedRecommendation?.summary ?? 'Choose a recommendation from the inbox to inspect its evidence and governance flow.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedRecommendation ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={urgencyTone(selectedRecommendation.urgency)}>{selectedRecommendation.urgency}</Badge>
                    <Badge variant="outline">{selectedRecommendation.status}</Badge>
                    <ConfidenceBadge value={selectedRecommendation.confidence} />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedRecommendation.rationale}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-950">Suggested owner</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedRecommendation.ownerSuggestion}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-950">Evidence</p>
                      {selectedRecommendation.evidence.map((item) => (
                        <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-950">Action path</p>
                      {selectedRecommendation.actions.map((action) => (
                        <div key={action} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">Governance</p>
                    <div className="flex flex-wrap gap-2">
                      {(['DRAFT', 'NEEDS_REVIEW', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED', 'ARCHIVED'] as const).map((status) => (
                        <Button
                          key={status}
                          variant={selectedRecommendation.status === status ? 'default' : 'outline'}
                          disabled={savingId === selectedRecommendation.id}
                          onClick={() => updateStatus(selectedRecommendation.id, status)}
                        >
                          {savingId === selectedRecommendation.id && selectedRecommendation.status !== status ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {status}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Reviewer note</p>
                      <Textarea
                        value={governanceNote}
                        onChange={(event) => setGovernanceNote(event.target.value)}
                        placeholder="Add a short management note for this recommendation."
                        className="min-h-24"
                      />
                      {selectedRecommendation.governance?.reviewedAt ? (
                        <p className="text-xs text-slate-500">
                          Last reviewed {new Date(selectedRecommendation.governance.reviewedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">AI Draft</p>
                    <Button
                      variant="outline"
                      onClick={() => loadDraft(selectedRecommendation.id)}
                      disabled={draftLoading}
                    >
                      {draftLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {draftLoading ? 'Drafting' : 'Generate Executive Wording'}
                    </Button>
                    {draft ? (
                      <IntelligenceAIOutputCard
                        title="Executive wording"
                        content={draft.content}
                        confidence={draft.confidence}
                        freshness={draft.freshness.workforce}
                        sourceSections={draft.sourceSections}
                        warnings={draft.warnings}
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  No recommendation is selected.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCheck className="h-5 w-5 text-emerald-600" />
                Control Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-700">
              The advisory inbox explains deterministic findings. A recommendation only becomes operational after an authorized human moves it through the review state.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
