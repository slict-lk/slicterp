'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type AuditPayload = {
  success: boolean;
  data: {
    records: Array<{
      id: string;
      action: string;
      summary: string;
      createdAt: string;
    }>;
  };
};

export default function IntelligenceAIAuditPage() {
  const [records, setRecords] = useState<AuditPayload['data']['records']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/intelligence/ai/audit')
      .then((result) => result.json())
      .then((payload: AuditPayload) => {
        if (!payload?.success) {
          throw new Error('Failed to load AI audit records.');
        }
        setRecords(payload.data.records);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">Loading AI audit trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Audit</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Audit view for intelligence-generated AI outputs using the shared AI control-plane logging path.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
            Intelligence AI audit records
          </CardTitle>
          <CardDescription>Each record below came through the intelligence AI adapter over the shared AI backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{record.action}</p>
                  <p className="mt-1 text-sm text-slate-600">{record.summary}</p>
                </div>
                <Badge variant="outline">{new Date(record.createdAt).toLocaleString()}</Badge>
              </div>
            </div>
          ))}
          {records.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No intelligence AI audit records exist yet. Generate a briefing, explanation, or chat response first.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
