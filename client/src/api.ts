import type {
  GroupState,
  OptimizeResult,
  PriceList,
  OrderItem,
  MemberShare,
} from '@mcdagobert/shared';

export type ResultResponse = OptimizeResult & { perMember: MemberShare[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    // Spread init first so its `headers` can't clobber Content-Type.
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  getPriceList: () => request<PriceList>('/price-list'),

  createGroup: (name: string) =>
    request<{ code: string; name: string; priceList: PriceList }>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getGroup: (code: string) => request<GroupState>(`/groups/${code}`),

  joinGroup: (code: string, name: string, deviceToken?: string) =>
    request<{ memberId: number; deviceToken: string }>(`/groups/${code}/members`, {
      method: 'POST',
      body: JSON.stringify({ name, deviceToken }),
    }),

  addItem: (memberId: number, token: string, itemName: string, qty: number) =>
    request<OrderItem>(`/members/${memberId}/items`, {
      method: 'POST',
      headers: { 'x-device-token': token },
      body: JSON.stringify({ itemName, qty }),
    }),

  updateItem: (itemId: number, token: string, qty: number) =>
    request<{ id: number; qty: number }>(`/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'x-device-token': token },
      body: JSON.stringify({ qty }),
    }),

  deleteItem: (itemId: number, token: string) =>
    request<void>(`/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'x-device-token': token },
    }),

  computeResult: (code: string) =>
    request<ResultResponse>(`/groups/${code}/result`, { method: 'POST' }),
};
