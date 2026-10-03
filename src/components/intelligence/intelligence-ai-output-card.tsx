'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBadge } from '@/components/intelligence/confidence-badge';
import { DataFreshnessStamp } from '@/components/intelligence/data-freshness-stamp';

type IntelligenceAIOutputCardProps = {
  title: string;
  description?: string;
  content: string;
  confidence?: number;
  freshness?: string | null;
  sourceSections?: string[];
  warnings?: string[];
  badgeLabel?: string;
};

export function IntelligenceAIOutputCard({
  title,
  description,
  content,
  confidence,
  freshness,
  sourceSections = [],
  warnings = [],
  badgeLabel = 'AI-generated from audited findings',
}: IntelligenceAIOutputCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              {title}
            </CardTitle>
            {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {typeof confidence === 'number' ? <ConfidenceBadge value={confidence} /> : null}
            <Badge variant="outline">{badgeLabel}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{content}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {sourceSections.map((section) => (
              <Badge key={section} variant="secondary">
                {section}
              </Badge>
            ))}
          </div>
          <DataFreshnessStamp value={freshness ?? null} />
        </div>
        {warnings.length > 0 ? (
          <div className="space-y-2">
            {warnings.map((warning) => (
              <div key={warning} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {warning}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
