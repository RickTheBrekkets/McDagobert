import type { OptimizeResult, SplitResult, MemberShare } from './types.js';

const toCents = (euros: number): number => Math.round(euros * 100);

/**
 * Combo-attributed split. A single item's price goes fully to its owner. A
 * combo's price is divided among its slot owners in proportion to each slot's
 * a-la-carte value, so the discount is shared by exactly the people whose items
 * formed that deal. Amounts are rounded to whole cents using the
 * largest-remainder (Hamilton) method so they sum back to the total exactly.
 */
export function computeSplit(result: OptimizeResult): SplitResult {
  // Accumulate each member's raw owed amount in fractional cents.
  const rawCents = new Map<number, number>();
  const add = (memberId: number, cents: number) => {
    rawCents.set(memberId, (rawCents.get(memberId) || 0) + cents);
  };

  for (const purchase of result.purchases) {
    if (purchase.kind === 'single') {
      add(purchase.owner, toCents(purchase.price));
      continue;
    }
    const priceCents = toCents(purchase.price);
    const alaCarteSum = purchase.slots.reduce((s, slot) => s + slot.alaCarte, 0);
    // Guard against a zero-priced combo of free items.
    if (alaCarteSum <= 0) {
      const share = priceCents / purchase.slots.length;
      for (const slot of purchase.slots) add(slot.owner, share);
      continue;
    }
    for (const slot of purchase.slots) {
      add(slot.owner, (priceCents * slot.alaCarte) / alaCarteSum);
    }
  }

  const totalCents = toCents(result.total);

  // Floor each member to whole cents, then hand out the leftover cents to the
  // members with the largest fractional remainder (ties broken by member id).
  const entries = [...rawCents.entries()]
    .map(([memberId, raw]) => ({
      memberId,
      floor: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    }))
    .sort((a, b) => a.memberId - b.memberId);

  let distributed = entries.reduce((s, e) => s + e.floor, 0);
  let leftover = totalCents - distributed;

  const byRemainder = [...entries].sort(
    (a, b) => b.remainder - a.remainder || a.memberId - b.memberId,
  );
  for (let i = 0; i < byRemainder.length && leftover > 0; i++) {
    byRemainder[i].floor += 1;
    leftover -= 1;
  }

  const perMember: MemberShare[] = entries
    .map((e) => ({ memberId: e.memberId, amount: e.floor / 100 }))
    .sort((a, b) => a.memberId - b.memberId);

  return { total: totalCents / 100, perMember };
}
