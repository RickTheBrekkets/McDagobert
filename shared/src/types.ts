// Core domain types shared between the server (which runs the optimizer/split)
// and the client (which renders results). Pure data — no I/O here.

/** A single buyable item, e.g. "Big Mac" -> 4.50 (euros). */
export type ItemPrices = Record<string, number>;

/** A value-meal combo. `items` lists exactly which items it contains (one each). */
export interface Combo {
  name: string;
  items: string[];
  price: number;
}

export interface PriceList {
  items: ItemPrices;
  combos: Combo[];
}

/** What one member wants. `qty` is always >= 1. */
export interface OrderItem {
  id: number;
  itemName: string;
  qty: number;
}

export interface Member {
  id: number;
  name: string;
  items: OrderItem[];
}

/** Full shared state of a group, as returned by GET /api/groups/:code. */
export interface GroupState {
  code: string;
  name: string;
  status: 'open' | 'finalized';
  priceList: PriceList;
  members: Member[];
}

/** One concrete unit of an ordered item, tagged with its owner (member id). */
export interface ItemInstance {
  instanceId: number;
  owner: number;
  itemName: string;
}

/** One slot inside a purchased combo, after provenance has been recovered. */
export interface ComboSlot {
  itemName: string;
  owner: number;
  alaCarte: number;
}

export type Purchase =
  | { kind: 'combo'; comboName: string; price: number; slots: ComboSlot[] }
  | { kind: 'single'; itemName: string; price: number; owner: number };

/** Output of the optimizer: cheapest set of purchases with full provenance. */
export interface OptimizeResult {
  total: number;
  alaCarteTotal: number;
  savings: number;
  purchases: Purchase[];
}

/** What a single member owes, in the combo-attributed split. */
export interface MemberShare {
  memberId: number;
  /** Amount owed, in euros, rounded to cents. */
  amount: number;
}

export interface SplitResult {
  /** Sum of all member amounts; equals OptimizeResult.total exactly. */
  total: number;
  perMember: MemberShare[];
}
