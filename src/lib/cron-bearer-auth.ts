import crypto from 'crypto';

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isCronBearerAuthorized(
  authHeader: string | null,
  cronSecret: string | undefined
) {
  if (!cronSecret || !authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const providedSecret = authHeader.slice('Bearer '.length);
  return safeEqual(providedSecret, cronSecret);
}
