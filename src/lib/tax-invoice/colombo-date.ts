/**
 * Calendar dates for Sri Lankan tax documents, computed in Asia/Colombo.
 *
 * Servers run in UTC and Sri Lanka is UTC+05:30, so for the first five and a
 * half hours of every local day a UTC-based date is still the previous day. An
 * invoice issued at 00:30 on 1 October would otherwise be stamped September.
 */
const COLOMBO = 'Asia/Colombo';

// Fixed English capitals rather than Intl month names: short month names vary
// by locale and ICU version (en-GB renders September as "Sept").
const MONTH_CODES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: COLOMBO,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

export interface ColomboDateParts {
  year: number;
  month: number;
  day: number;
}

export function colomboDateParts(date: Date): ColomboDateParts {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid date');
  }
  const parts = partsFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

/**
 * `YYMMM` - the date stamp that opens a tax invoice serial number, e.g. `26OCT`.
 *
 * Circular SEC/2026/E/03 s.4.4 describes YY as the "1st two digits of the Year"
 * but gives `26` as its example for 2026. The example is the only reading that
 * distinguishes one year from another, so YY is the last two digits.
 */
export function serialDatePrefix(date: Date): string {
  const { year, month } = colomboDateParts(date);
  return `${String(year % 100).padStart(2, '0')}${MONTH_CODES[month - 1]}`;
}
