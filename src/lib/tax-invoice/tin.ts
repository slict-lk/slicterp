/** A Sri Lankan Taxpayer Identification Number is exactly nine digits (Circular SEC/2026/E/03 s.4.2). */
const TIN_PATTERN = /^\d{9}$/;

/**
 * Returns the nine-digit TIN, or null if the value is not one. Deliberately
 * strict: a VAT registration number or a TIN with separators is rejected rather
 * than guessed at, because the invoice must carry the TIN exactly.
 */
export function normalizeTin(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return TIN_PATTERN.test(trimmed) ? trimmed : null;
}
