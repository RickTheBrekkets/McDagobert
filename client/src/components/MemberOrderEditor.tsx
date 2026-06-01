import { useState } from 'react';
import type { Member, PriceList } from '@mcdagobert/shared';
import { api } from '../api.js';

interface Props {
  member: Member;
  token: string;
  priceList: PriceList;
  onChange: () => void;
}

// The current user's own order: add items, bump quantities, remove rows.
export function MemberOrderEditor({ member, token, priceList, onChange }: Props) {
  const itemNames = Object.keys(priceList.items);
  const [selected, setSelected] = useState(itemNames[0] ?? '');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.addItem(member.id, token, selected, 1);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function setQty(itemId: number, qty: number) {
    if (qty < 1) return;
    await api.updateItem(itemId, token, qty);
    onChange();
  }

  async function remove(itemId: number) {
    await api.deleteItem(itemId, token);
    onChange();
  }

  return (
    <section className="card">
      <h2>Your order</h2>

      {member.items.length === 0 && <p className="muted">Nothing yet — add an item.</p>}

      <ul className="item-list">
        {member.items.map((it) => (
          <li key={it.id} className="item-row">
            <span className="item-name">{it.itemName}</span>
            <span className="price">€{priceList.items[it.itemName].toFixed(2)}</span>
            <div className="qty">
              <button className="btn small" onClick={() => setQty(it.id, it.qty - 1)}>
                −
              </button>
              <span>{it.qty}</span>
              <button className="btn small" onClick={() => setQty(it.id, it.qty + 1)}>
                +
              </button>
            </div>
            <button className="btn small ghost" onClick={() => remove(it.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="add-row">
        <select
          className="input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {itemNames.map((name) => (
            <option key={name} value={name}>
              {name} — €{priceList.items[name].toFixed(2)}
            </option>
          ))}
        </select>
        <button className="btn primary" onClick={add} disabled={busy}>
          Add
        </button>
      </div>
    </section>
  );
}
