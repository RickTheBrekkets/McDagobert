import { randomBytes, randomUUID } from 'node:crypto';

// Human-friendly, unambiguous alphabet (no 0/O/1/I) for shareable join codes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function generateDeviceToken(): string {
  return randomUUID();
}
