import { createHash, timingSafeEqual } from 'crypto';
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export function tokenMatches(token: string, hashed: string): boolean {
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(hashed);
  return a.length === b.length && timingSafeEqual(a, b);
}
