export function SeverityTracker({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = clamped >= 80 ? 'bg-rose-600' : clamped >= 60 ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Severity</span>
        <span className="font-semibold text-slate-950">{clamped.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
