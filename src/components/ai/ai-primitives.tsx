import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AIPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8 px-1 pb-10 pt-6 md:px-4">
      <div className="flex flex-col gap-6 border-b border-slate-200/60 pb-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-600/80">Intelligence Hub</p>
          </div>
          <h1 className="bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-500/90">{description}</p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="animate-in fade-in zoom-in-95 duration-700 delay-150">
        {children}
      </div>
    </div>
  );
}

export function AIActionLink({
  href,
  label,
  variant = 'default',
}: {
  href: string;
  label: string;
  variant?: 'default' | 'outline' | 'ghost';
}) {
  return (
    <Button asChild variant={variant} className="shadow-sm transition-all hover:translate-y-[-1px] hover:shadow-md active:translate-y-0">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function AIStatGrid({
  items,
}: {
  items: Array<{ label: string; value: string; hint: string; tone?: 'slate' | 'sky' | 'amber' | 'emerald' }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <AIStatCard key={`${item.label}-${index}`} {...item} />
      ))}
    </div>
  );
}

export function AIStatCard({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'slate' | 'sky' | 'amber' | 'emerald';
}) {
  const toneMap = {
    slate: 'border-slate-200/50 bg-white/70 hover:bg-white',
    sky: 'border-sky-200/50 bg-sky-50/40 hover:bg-sky-50/60',
    amber: 'border-amber-200/50 bg-amber-50/40 hover:bg-amber-50/60',
    emerald: 'border-emerald-200/50 bg-emerald-50/40 hover:bg-emerald-50/60',
  } as const;

  const accentMap = {
    slate: 'bg-slate-400',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  };

  return (
    <Card className={cn(
      'group relative overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-200/30',
      toneMap[tone]
    )}>
      <div className={cn('absolute left-0 top-0 h-full w-1 opacity-20 transition-opacity group-hover:opacity-100', accentMap[tone])} />
      <CardContent className="relative space-y-3 p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-500">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <p className="text-4xl font-bold tracking-tighter text-slate-950 transition-transform duration-300 group-hover:translate-x-1">
            {value}
          </p>
        </div>
        <p className="text-sm font-medium text-slate-400/80 group-hover:text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function AISectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(
      'overflow-hidden border-slate-200/60 transition-all duration-500 hover:shadow-lg hover:shadow-slate-100 bg-white/80 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="relative flex flex-col gap-4 border-b border-slate-100/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-16 translate-y-[-16px] rounded-full bg-slate-50 opacity-40 blur-3xl" />
        <div className="relative">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </CardTitle>
          <CardDescription className="mt-1.5 text-sm text-slate-500/90 leading-relaxed max-w-2xl">
            {description}
          </CardDescription>
        </div>
        {action ? <div className="relative flex items-center gap-3">{action}</div> : null}
      </CardHeader>
      <CardContent className="p-6 relative">
        {children}
      </CardContent>
    </Card>
  );
}

export function AIFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="group space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50/40 p-6 transition-all hover:bg-slate-50/80">
      <div>
        <h2 className="text-base font-bold text-slate-800 transition-colors group-hover:text-sky-700">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="relative pt-2">
        {children}
      </div>
    </div>
  );
}

export function AIStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const isErr = normalized.includes('fail') || normalized.includes('reject') || normalized.includes('critical');
  const isWarn = normalized.includes('pending') || normalized.includes('attention') || normalized.includes('queued');
  
  const variant = isErr ? 'destructive' : isWarn ? 'secondary' : 'outline';

  return (
    <Badge 
      variant={variant} 
      className={cn(
        "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        !isErr && !isWarn && "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {status}
    </Badge>
  );
}

export function AIEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 p-12 text-center transition-all hover:border-sky-200 hover:bg-white/60">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 transition-transform group-hover:scale-110 group-hover:bg-sky-50">
        <div className="h-2 w-8 rounded-full bg-slate-200 group-hover:bg-sky-200" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">{description}</p>
      {action ? <div className="mt-6 flex justify-center animate-bounce-slow">{action}</div> : null}
    </div>
  );
}

export function AIMetaList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div 
          key={`${item.label}-${index}`} 
          className="group rounded-2xl border border-slate-200/60 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors group-hover:text-sky-600">
            {item.label}
          </dt>
          <dd className="mt-3 text-sm font-semibold text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
