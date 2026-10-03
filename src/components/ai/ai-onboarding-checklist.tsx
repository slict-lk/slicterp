import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  help: string;
};

export function AIOnboardingChecklist({
  items,
  title = 'Getting Started',
  description = 'Use this checklist to make the AI workspace usable for business teams.',
}: {
  items: ChecklistItem[];
  title?: string;
  description?: string;
}) {
  const completeCount = items.filter((item) => item.done).length;

  return (
    <Card className="overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-slate-100">
      <CardHeader className="relative border-b border-slate-100/80 pb-6">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-12 translate-y-[-12px] rounded-full bg-sky-50 opacity-40 blur-2xl" />
        <div className="relative">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">{title}</CardTitle>
          <CardDescription className="mt-1.5 text-sm text-slate-500">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50/60 p-4 text-sm font-semibold text-slate-700 border border-slate-100">
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-sky-400 border border-white" />
            ))}
          </div>
          {completeCount} of {items.length} setup steps completed
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200/50 bg-white p-5 transition-all hover:border-sky-200 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  item.done ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 group-hover:border-sky-300"
                )}>
                  {item.done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-sky-900 transition-colors">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{item.help}</p>
                </div>
              </div>
              <Button asChild variant={item.done ? 'outline' : 'default'} size="sm" className="rounded-xl shadow-sm transition-transform hover:scale-105 active:scale-95">
                <Link href={item.href}>{item.done ? 'Review' : 'Open'}</Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
