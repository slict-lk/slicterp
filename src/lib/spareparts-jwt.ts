import jwt from 'jsonwebtoken';

/**
 * Shared JWT handling for the anonymous /api/public/spareparts/* storefront.
 *
 * These routes previously each declared `process.env.NEXTAUTH_SECRET || 'secret'`.
 * With the secret unset, that literal signed and verified every customer token,
 * so anyone could mint a valid session for any customer in any tenant.
 *
 * The secret is resolved per call rather than at module load: Next.js evaluates
 * route modules during `next build`, where the runtime env is not yet present.
 */
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set; refusing to issue or accept customer tokens.');
  }

  return secret;
}

const ALGORITHM = 'HS256' as const;

export function signCustomerToken(
  payload: Record<string, unknown>,
  options: jwt.SignOptions = {}
): string {
  return jwt.sign(payload, getSecret(), { algorithm: ALGORITHM, ...options });
}

/**
 * Verifies a storefront customer token. Pins the algorithm so a token cannot
 * dictate how it is validated. Throws on any invalid or unverifiable token -
 * callers already wrap this and return 401.
 */
export function verifyCustomerToken(token: string): any {
  return jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });
}
