import { describe, it, expect } from 'vitest';
import { computeSplit } from './split.js';
import { computeResult } from './optimizer.js';
import { defaultPriceList } from './defaultPriceList.js';
import type { GroupState, Member, OptimizeResult } from './types.js';

let nextItemId = 1;
function member(id: number, name: string, items: [string, number][]): Member {
  return {
    id,
    name,
    items: items.map(([itemName, qty]) => ({ id: nextItemId++, itemName, qty })),
  };
}
function group(members: Member[]): GroupState {
  return { code: 'T', name: 'T', status: 'open', priceList: defaultPriceList, members };
}
const amountFor = (split: { perMember: { memberId: number; amount: number }[] }, id: number) =>
  split.perMember.find((m) => m.memberId === id)?.amount ?? 0;
const sumCents = (split: { perMember: { amount: number }[] }) =>
  split.perMember.reduce((s, m) => s + Math.round(m.amount * 100), 0);

describe('computeSplit (combo-attributed)', () => {
  it('splits one Big Mac Menu across three owners by a-la-carte value', () => {
    const g = group([
      member(1, 'A', [['Big Mac', 1]]),
      member(2, 'B', [['Medium Fries', 1]]),
      member(3, 'C', [['Medium Coke', 1]]),
    ]);
    const result = computeResult(g);
    const split = computeSplit(result);

    // €8.50 * 4.50/9.25 = 4.135..., *2.50/9.25 = 2.297..., *2.25/9.25 = 2.068...
    // The two leftover cents go to the largest remainders (Coke .76, Fries .73),
    // so Big Mac rounds down to 4.13.
    expect(amountFor(split, 1)).toBe(4.13);
    expect(amountFor(split, 2)).toBe(2.3);
    expect(amountFor(split, 3)).toBe(2.07);
    // Must reconcile to €8.50 exactly.
    expect(sumCents(split)).toBe(850);
    expect(split.total).toBe(8.5);
  });

  it('charges the full combo to a single owner of all its items', () => {
    const g = group([
      member(1, 'A', [['Big Mac', 1], ['Medium Fries', 1], ['Medium Coke', 1]]),
    ]);
    const split = computeSplit(computeResult(g));
    expect(amountFor(split, 1)).toBe(8.5);
    expect(sumCents(split)).toBe(850);
  });

  it('bills leftover singles fully to their owner', () => {
    const g = group([
      member(1, 'A', [['Big Mac', 1], ['Medium Fries', 1], ['Medium Coke', 1]]),
      member(2, 'B', [['Small Coke', 1]]), // no combo applies -> single €2.00
    ]);
    const result = computeResult(g);
    const split = computeSplit(result);
    expect(amountFor(split, 2)).toBe(2.0);
    expect(amountFor(split, 1)).toBe(8.5);
    expect(sumCents(split)).toBe(Math.round(result.total * 100));
  });

  it('always reconciles to the total for random groups', () => {
    const items = Object.keys(defaultPriceList.items);
    const rnd = (n: number) => Math.floor(Math.random() * n);
    for (let trial = 0; trial < 100; trial++) {
      const members: Member[] = [];
      const memberCount = 1 + rnd(4);
      for (let m = 0; m < memberCount; m++) {
        const picks: [string, number][] = [];
        const itemCount = 1 + rnd(3);
        for (let k = 0; k < itemCount; k++) picks.push([items[rnd(items.length)], 1 + rnd(2)]);
        members.push(member(m + 1, `M${m}`, picks));
      }
      const result: OptimizeResult = computeResult(group(members));
      const split = computeSplit(result);
      expect(sumCents(split)).toBe(Math.round(result.total * 100));
    }
  });
});
