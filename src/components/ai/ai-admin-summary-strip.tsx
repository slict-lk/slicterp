import { Card, CardContent } from '@/components/ui/card';

export function AIAdminSummaryStrip({
  title,
  audience,
  readiness,
  description,
}: {
  title: string;
  audience: string;
  readiness: string;
  description: string;
}) {
  return (
    <Card className="border-slate-200 bg-slate-50/80 shadow-sm">
      <CardContent className="grid gap-4 p-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What this controls</p>
          <p className="mt-2 text-sm text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Who should edit this</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{audience}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Setup status</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{readiness}</p>
        </div>
      </CardContent>
    </Card>
  );
}
