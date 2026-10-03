export function joinList(values: string[] | null | undefined) {
  return Array.isArray(values) ? values.join(', ') : '';
}

export function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function numberOrUndefined(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function nullableString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function readResponseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error || fallback;
}
