export function DataFreshnessStamp({ value }: { value?: string | null }) {
  const label = value
    ? new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
    : 'Not generated yet';

  return (
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
      Data freshness: {label}
    </p>
  );
}
