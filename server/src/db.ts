import Database from 'better-sqlite3';
import type {
  GroupState,
  Member,
  OrderItem,
  PriceList,
} from '@mcdagobert/shared';

// Thin repository over SQLite. All access goes through here so a later move to
// Postgres is mechanical. Pass ':memory:' for tests.
export interface Repo {
  createGroup(input: {
    code: string;
    name: string;
    priceList: PriceList;
  }): void;
  getGroupRow(code: string): { id: number; name: string; status: string; priceList: PriceList } | undefined;
  getGroupState(code: string): GroupState | undefined;
  upsertMember(input: {
    code: string;
    name: string;
    deviceToken: string;
  }): { memberId: number; deviceToken: string } | undefined;
  getMemberGroupCode(memberId: number): string | undefined;
  addItem(input: { memberId: number; itemName: string; qty: number }): OrderItem | undefined;
  updateItemQty(itemId: number, qty: number): boolean;
  deleteItem(itemId: number): boolean;
  getItemOwnerToken(itemId: number): string | undefined;
  getMemberToken(memberId: number): string | undefined;
  setGroupStatus(code: string, status: 'open' | 'finalized'): void;
}

export function createRepo(filename = process.env.DB_PATH || 'mcdagobert.db'): Repo {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price_list TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      device_token TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL CHECK (qty >= 1)
    );
    CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
    CREATE INDEX IF NOT EXISTS idx_items_member ON order_items(member_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_members_token
      ON members(group_id, device_token);
  `);

  return {
    createGroup({ code, name, priceList }) {
      db.prepare(
        `INSERT INTO groups (code, name, price_list, status, created_at)
         VALUES (?, ?, ?, 'open', ?)`,
      ).run(code, name, JSON.stringify(priceList), new Date().toISOString());
    },

    getGroupRow(code) {
      const row = db
        .prepare(`SELECT id, name, status, price_list FROM groups WHERE code = ?`)
        .get(code) as
        | { id: number; name: string; status: string; price_list: string }
        | undefined;
      if (!row) return undefined;
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        priceList: JSON.parse(row.price_list) as PriceList,
      };
    },

    getGroupState(code) {
      const group = this.getGroupRow(code);
      if (!group) return undefined;
      const memberRows = db
        .prepare(`SELECT id, name FROM members WHERE group_id = ? ORDER BY id`)
        .all(group.id) as { id: number; name: string }[];
      const itemStmt = db.prepare(
        `SELECT id, item_name, qty FROM order_items WHERE member_id = ? ORDER BY id`,
      );
      const members: Member[] = memberRows.map((m) => {
        const items = itemStmt.all(m.id) as { id: number; item_name: string; qty: number }[];
        return {
          id: m.id,
          name: m.name,
          items: items.map<OrderItem>((it) => ({
            id: it.id,
            itemName: it.item_name,
            qty: it.qty,
          })),
        };
      });
      return {
        code,
        name: group.name,
        status: group.status as 'open' | 'finalized',
        priceList: group.priceList,
        members,
      };
    },

    upsertMember({ code, name, deviceToken }) {
      const group = this.getGroupRow(code);
      if (!group) return undefined;
      const existing = db
        .prepare(`SELECT id FROM members WHERE group_id = ? AND device_token = ?`)
        .get(group.id, deviceToken) as { id: number } | undefined;
      if (existing) {
        db.prepare(`UPDATE members SET name = ? WHERE id = ?`).run(name, existing.id);
        return { memberId: existing.id, deviceToken };
      }
      const info = db
        .prepare(
          `INSERT INTO members (group_id, name, device_token, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(group.id, name, deviceToken, new Date().toISOString());
      return { memberId: Number(info.lastInsertRowid), deviceToken };
    },

    getMemberGroupCode(memberId) {
      const row = db
        .prepare(
          `SELECT g.code AS code FROM members m
           JOIN groups g ON g.id = m.group_id WHERE m.id = ?`,
        )
        .get(memberId) as { code: string } | undefined;
      return row?.code;
    },

    addItem({ memberId, itemName, qty }) {
      const info = db
        .prepare(`INSERT INTO order_items (member_id, item_name, qty) VALUES (?, ?, ?)`)
        .run(memberId, itemName, qty);
      return { id: Number(info.lastInsertRowid), itemName, qty };
    },

    updateItemQty(itemId, qty) {
      const info = db.prepare(`UPDATE order_items SET qty = ? WHERE id = ?`).run(qty, itemId);
      return info.changes > 0;
    },

    deleteItem(itemId) {
      const info = db.prepare(`DELETE FROM order_items WHERE id = ?`).run(itemId);
      return info.changes > 0;
    },

    getItemOwnerToken(itemId) {
      const row = db
        .prepare(
          `SELECT m.device_token AS token FROM order_items i
           JOIN members m ON m.id = i.member_id WHERE i.id = ?`,
        )
        .get(itemId) as { token: string } | undefined;
      return row?.token;
    },

    getMemberToken(memberId) {
      const row = db
        .prepare(`SELECT device_token AS token FROM members WHERE id = ?`)
        .get(memberId) as { token: string } | undefined;
      return row?.token;
    },

    setGroupStatus(code, status) {
      db.prepare(`UPDATE groups SET status = ? WHERE code = ?`).run(status, code);
    },
  };
}
