import { describe, it, expect } from 'vitest';
import { computeResult, solveCounts } from './optimizer.js';
import { defaultPriceList } from './defaultPriceList.js';
import type { GroupState, Member } from './types.js';

let nextItemId = 1;
function member(id: number, name: string, items: [string, number][]): Member {
  return {
    id,
    name,
    items: items.map(([itemName, qty]) => ({ id: nextItemId++, itemName, qty })),
  };
}

function group(members: Member[]): GroupState {
  return {
    code: 'TEST',
    name: 'Test',
    status: 'open',
    priceList: defaultPriceList,
    members,
  };
}

describe('solveCounts (cost, parity with prototype DP)', () => {
  it('uses a Big Mac Menu instead of three singles', () => {
    const sol = solveCounts(
      { 'Big Mac': 1, 'Medium Fries': 1, 'Medium Coke': 1 },
      defaultPriceList,
    );
    // Combo €8.50 < singles 4.50 + 2.50 + 2.25 = €9.25
    expect(sol.cost).toBe(850);
    expect(sol.combos).toEqual({ 'Big Mac Menu': 1 });
    expect(sol.singles).toEqual({});
  });

  it('buys a lone item as a single', () => {
    const sol = solveCounts({ 'Small Coke': 1 }, defaultPriceList);
    expect(sol.cost).toBe(200);
    expect(sol.singles).toEqual({ 'Small Coke': 1 });
  });

  it('is deterministic across repeated runs', () => {
    const req = { 'Big Mac': 2, 'Medium Fries': 1, 'Medium Coke': 1, McChicken: 1 };
    const a = solveCounts(req, defaultPriceList);
    const b = solveCounts(req, defaultPriceList);
    expect(a).toEqual(b);
  });
});

describe('computeResult (provenance)', () => {
  it('forms a Big Mac Menu and attributes each slot to its owner', () => {
    const g = group([
      member(1, 'Alice', [['Big Mac', 1], ['Medium Fries', 1], ['Medium Coke', 1]]),
    ]);
    const result = computeResult(g);
    expect(result.total).toBe(8.5);
    expect(result.purchases).toHaveLength(1);
    const p = result.purchases[0];
    expect(p.kind).toBe('combo');
    if (p.kind === 'combo') {
      expect(p.comboName).toBe('Big Mac Menu');
      expect(p.slots.every((s) => s.owner === 1)).toBe(true);
    }
  });

  it('attributes combo slots across two members correctly', () => {
    // Alice brings the Big Mac, Bob brings the fries + coke -> one Big Mac Menu.
    const g = group([
      member(1, 'Alice', [['Big Mac', 1]]),
      member(2, 'Bob', [['Medium Fries', 1], ['Medium Coke', 1]]),
    ]);
    const result = computeResult(g);
    expect(result.total).toBe(8.5);
    const p = result.purchases[0];
    expect(p.kind).toBe('combo');
    if (p.kind === 'combo') {
      const owners = Object.fromEntries(p.slots.map((s) => [s.itemName, s.owner]));
      expect(owners['Big Mac']).toBe(1);
      expect(owners['Medium Fries']).toBe(2);
      expect(owners['Medium Coke']).toBe(2);
    }
  });

  it('never invents or drops an ordered item (provenance is a permutation)', () => {
    const g = group([
      member(1, 'Alice', [['Big Mac', 2], ['Medium Fries', 1]]),
      member(2, 'Bob', [['Medium Coke', 1], ['Small Coke', 1], ['McChicken', 1]]),
    ]);
    const result = computeResult(g);

    const ordered: string[] = [];
    for (const m of g.members)
      for (const it of m.items)
        for (let i = 0; i < it.qty; i++) ordered.push(`${m.id}:${it.itemName}`);

    const supplied: string[] = [];
    for (const p of result.purchases) {
      if (p.kind === 'single') supplied.push(`${p.owner}:${p.itemName}`);
      else for (const s of p.slots) supplied.push(`${s.owner}:${s.itemName}`);
    }
    expect(supplied.sort()).toEqual(ordered.sort());
  });

  it('handles an empty group', () => {
    const result = computeResult(group([]));
    expect(result).toEqual({ total: 0, alaCarteTotal: 0, savings: 0, purchases: [] });
  });

  it('reports savings vs a-la-carte', () => {
    const g = group([
      member(1, 'Alice', [['Big Mac', 1], ['Medium Fries', 1], ['Medium Coke', 1]]),
    ]);
    const result = computeResult(g);
    expect(result.alaCarteTotal).toBeCloseTo(9.25, 5);
    expect(result.savings).toBeCloseTo(0.75, 5);
  });
});
