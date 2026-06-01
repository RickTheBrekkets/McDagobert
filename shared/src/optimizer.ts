import type {
  GroupState,
  ItemInstance,
  OptimizeResult,
  PriceList,
  Purchase,
  ComboSlot,
} from './types.js';

// Work in integer cents internally so cost comparisons are exact and the
// chosen plan is deterministic across devices (no float drift).
const toCents = (euros: number): number => Math.round(euros * 100);

type CountMap = Record<string, number>;

interface CountSolution {
  /** Total cost in cents. */
  cost: number;
  /** Chosen combos by name -> how many. */
  combos: Record<string, number>;
  /** Chosen single items by name -> how many. */
  singles: Record<string, number>;
}

function cloneCounts(m: CountMap): CountMap {
  return { ...m };
}

/** Stable memo key: sorted "item:qty" pairs (ported from the prototype). */
function reqKey(req: CountMap): string {
  return Object.keys(req)
    .filter((k) => req[k] > 0)
    .sort()
    .map((k) => `${k}:${req[k]}`)
    .join(',');
}

/**
 * Phase 1 — flatten each member's order into individual owned units. A member
 * ordering 2x Big Mac yields two instances. Instance ids are assigned in a
 * deterministic order (member id, then item name) so results are reproducible.
 */
export function flattenInstances(group: GroupState): {
  instances: ItemInstance[];
  requirement: CountMap;
} {
  const instances: ItemInstance[] = [];
  const requirement: CountMap = {};
  let nextId = 0;

  const members = [...group.members].sort((a, b) => a.id - b.id);
  for (const member of members) {
    const items = [...member.items].sort((a, b) =>
      a.itemName.localeCompare(b.itemName),
    );
    for (const item of items) {
      for (let i = 0; i < item.qty; i++) {
        instances.push({
          instanceId: nextId++,
          owner: member.id,
          itemName: item.itemName,
        });
        requirement[item.itemName] = (requirement[item.itemName] || 0) + 1;
      }
    }
  }
  return { instances, requirement };
}

/**
 * Phase 2 — cheapest combination over counts. Refactor of the prototype's
 * optimize() (public/app.js:72-119): memoized DP, but with a fresh memo per
 * call and combos visited in name order so the plan is deterministic.
 */
export function solveCounts(req: CountMap, priceList: PriceList): CountSolution {
  const combos = [...priceList.combos].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const itemCents: Record<string, number> = {};
  for (const [name, price] of Object.entries(priceList.items)) {
    itemCents[name] = toCents(price);
  }
  const memo = new Map<string, CountSolution>();

  function solve(state: CountMap): CountSolution {
    const key = reqKey(state);
    const cached = memo.get(key);
    if (cached) return cached;

    if (key === '') {
      const done: CountSolution = { cost: 0, combos: {}, singles: {} };
      memo.set(key, done);
      return done;
    }

    let best: CountSolution = { cost: Infinity, combos: {}, singles: {} };

    // Branch A: apply a combo whose every item is still needed (one of each).
    for (const combo of combos) {
      const next = cloneCounts(state);
      let applicable = true;
      for (const item of combo.items) {
        if (!next[item] || next[item] <= 0) {
          applicable = false;
          break;
        }
        next[item] -= 1;
      }
      if (!applicable) continue;
      const sub = solve(next);
      const cost = sub.cost + toCents(combo.price);
      if (cost < best.cost) {
        best = {
          cost,
          combos: { ...sub.combos },
          singles: { ...sub.singles },
        };
        best.combos[combo.name] = (best.combos[combo.name] || 0) + 1;
      }
    }

    // Branch B: buy one single item. Visit item names in sorted order.
    for (const item of Object.keys(state).sort()) {
      if (state[item] <= 0) continue;
      const next = cloneCounts(state);
      next[item] -= 1;
      const sub = solve(next);
      const cost = sub.cost + itemCents[item];
      if (cost < best.cost) {
        best = {
          cost,
          combos: { ...sub.combos },
          singles: { ...sub.singles },
        };
        best.singles[item] = (best.singles[item] || 0) + 1;
      }
    }

    memo.set(key, best);
    return best;
  }

  return solve(req);
}

interface Slot {
  itemName: string;
  /** Index into the purchases array this slot belongs to. */
  purchaseIndex: number;
  /** -1 for a single; otherwise position within the combo's items. */
  slotIndex: number;
}

/**
 * Phase 3 — recover provenance. The DP only told us how many of each combo and
 * single to buy. Expand those into concrete slots and assign each owned
 * instance to a slot of the same item type. Supply == demand per item type
 * (the DP consumed exactly the requirement), so a perfect matching exists; we
 * pick the deterministic one (instances sorted by owner, slots in purchase
 * order). Note: when one item type spans differently-priced combos, this fixed
 * assignment also fixes who benefits from the bigger discount — a deliberate,
 * documented simplification rather than averaging.
 */
function assignProvenance(
  solution: CountSolution,
  instances: ItemInstance[],
  priceList: PriceList,
): Purchase[] {
  // Build the purchase skeletons (combos first by name, then singles) and the
  // flat list of slots that need owners.
  const purchases: Purchase[] = [];
  const slots: Slot[] = [];

  const comboByName = new Map(priceList.combos.map((c) => [c.name, c]));
  for (const comboName of Object.keys(solution.combos).sort()) {
    const combo = comboByName.get(comboName)!;
    for (let n = 0; n < solution.combos[comboName]; n++) {
      const purchaseIndex = purchases.length;
      const comboSlots: ComboSlot[] = combo.items.map((itemName) => ({
        itemName,
        owner: -1,
        alaCarte: priceList.items[itemName],
      }));
      purchases.push({
        kind: 'combo',
        comboName,
        price: combo.price,
        slots: comboSlots,
      });
      combo.items.forEach((itemName, slotIndex) => {
        slots.push({ itemName, purchaseIndex, slotIndex });
      });
    }
  }

  for (const itemName of Object.keys(solution.singles).sort()) {
    for (let n = 0; n < solution.singles[itemName]; n++) {
      const purchaseIndex = purchases.length;
      purchases.push({
        kind: 'single',
        itemName,
        price: priceList.items[itemName],
        owner: -1,
      });
      slots.push({ itemName, purchaseIndex, slotIndex: -1 });
    }
  }

  // Group instances and slots by item type, then zip them deterministically.
  const instancesByItem = new Map<string, ItemInstance[]>();
  for (const inst of instances) {
    const list = instancesByItem.get(inst.itemName) || [];
    list.push(inst);
    instancesByItem.set(inst.itemName, list);
  }
  for (const list of instancesByItem.values()) {
    list.sort((a, b) => a.owner - b.owner || a.instanceId - b.instanceId);
  }

  const slotsByItem = new Map<string, Slot[]>();
  for (const slot of slots) {
    const list = slotsByItem.get(slot.itemName) || [];
    list.push(slot);
    slotsByItem.set(slot.itemName, list);
  }

  for (const [itemName, itemSlots] of slotsByItem) {
    const pool = instancesByItem.get(itemName) || [];
    itemSlots.forEach((slot, i) => {
      const owner = pool[i].owner;
      const purchase = purchases[slot.purchaseIndex];
      if (purchase.kind === 'combo') {
        purchase.slots[slot.slotIndex].owner = owner;
      } else {
        purchase.owner = owner;
      }
    });
  }

  return purchases;
}

/** Full pipeline: flatten -> solve -> recover provenance -> assemble result. */
export function computeResult(group: GroupState): OptimizeResult {
  const { instances, requirement } = flattenInstances(group);

  const alaCarteCents = instances.reduce(
    (sum, inst) => sum + toCents(group.priceList.items[inst.itemName]),
    0,
  );

  if (instances.length === 0) {
    return { total: 0, alaCarteTotal: 0, savings: 0, purchases: [] };
  }

  const solution = solveCounts(requirement, group.priceList);
  const purchases = assignProvenance(solution, instances, group.priceList);

  const totalCents = solution.cost;
  return {
    total: totalCents / 100,
    alaCarteTotal: alaCarteCents / 100,
    savings: (alaCarteCents - totalCents) / 100,
    purchases,
  };
}
