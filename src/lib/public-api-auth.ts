import crypto from 'crypto';

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Fail-closed bearer check for the anonymous /api/public/* surface.
 *
 * Every call site previously wrote `if (process.env.PUBLIC_API_KEY && header !== ...)`,
 * which silently allowed every request whenever the key was unset. This refuses instead.
 */
export function isPublicApiAuthorized(authHeader: string | null) {
  const apiKey = process.env.PUBLIC_API_KEY;

  if (!apiKey || !authHeader?.startsWith('Bearer ')) {
    return false;
  }

  return safeEqual(authHeader.slice('Bearer '.length), apiKey);
}
