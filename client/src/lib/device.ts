// Per-group identity stored in localStorage so a phone resumes as the same
// member without any account. Keyed by group code.

interface DeviceIdentity {
  memberId: number;
  deviceToken: string;
  name: string;
}

const key = (code: string) => `mcdagobert:member:${code.toUpperCase()}`;

export function loadIdentity(code: string): DeviceIdentity | null {
  const raw = localStorage.getItem(key(code));
  return raw ? (JSON.parse(raw) as DeviceIdentity) : null;
}

export function saveIdentity(code: string, identity: DeviceIdentity): void {
  localStorage.setItem(key(code), JSON.stringify(identity));
}
