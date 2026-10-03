import { Badge } from '@/components/ui/badge';

export function ConfidenceBadge({ value }: { value: number }) {
  const rounded = Math.round(value);
  const classes = rounded >= 85
    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
    : rounded >= 65
      ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
      : 'bg-rose-100 text-rose-700 hover:bg-rose-100';

  return <Badge className={classes}>Confidence {rounded}%</Badge>;
}
