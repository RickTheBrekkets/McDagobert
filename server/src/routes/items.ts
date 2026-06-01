import { Router } from 'express';
import type { Repo } from '../db.js';

const tokenOf = (req: { header(name: string): string | undefined }) =>
  req.header('x-device-token') || '';

function parseQty(value: unknown): number | null {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1) return null;
  return qty;
}

export function itemRoutes(repo: Repo): Router {
  const router = Router();

  // Add an item to a member's order. Caller must own the member (device token).
  router.post('/members/:memberId/items', (req, res) => {
    const memberId = Number(req.params.memberId);
    const token = repo.getMemberToken(memberId);
    if (!token) return res.status(404).json({ error: 'member not found' });
    if (token !== tokenOf(req)) return res.status(403).json({ error: 'not your order' });

    const code = repo.getMemberGroupCode(memberId);
    const group = code ? repo.getGroupRow(code) : undefined;
    if (!group) return res.status(404).json({ error: 'group not found' });

    const itemName = String(req.body?.itemName ?? '');
    if (!(itemName in group.priceList.items)) {
      return res.status(400).json({ error: 'unknown item' });
    }
    const qty = parseQty(req.body?.qty ?? 1);
    if (qty === null) return res.status(400).json({ error: 'qty must be an integer >= 1' });

    const item = repo.addItem({ memberId, itemName, qty });
    res.status(201).json(item);
  });

  // Update a quantity. Caller must own the item.
  router.patch('/items/:itemId', (req, res) => {
    const itemId = Number(req.params.itemId);
    const token = repo.getItemOwnerToken(itemId);
    if (!token) return res.status(404).json({ error: 'item not found' });
    if (token !== tokenOf(req)) return res.status(403).json({ error: 'not your item' });

    const qty = parseQty(req.body?.qty);
    if (qty === null) return res.status(400).json({ error: 'qty must be an integer >= 1' });
    repo.updateItemQty(itemId, qty);
    res.json({ id: itemId, qty });
  });

  // Remove an item. Caller must own it.
  router.delete('/items/:itemId', (req, res) => {
    const itemId = Number(req.params.itemId);
    const token = repo.getItemOwnerToken(itemId);
    if (!token) return res.status(404).json({ error: 'item not found' });
    if (token !== tokenOf(req)) return res.status(403).json({ error: 'not your item' });

    repo.deleteItem(itemId);
    res.status(204).end();
  });

  return router;
}
