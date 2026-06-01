import { Router } from 'express';
import {
  computeResult,
  computeSplit,
  defaultPriceList,
} from '@mcdagobert/shared';
import type { Repo } from '../db.js';
import { generateCode } from '../codes.js';

export function groupRoutes(repo: Repo): Router {
  const router = Router();

  // Global default price list (for the create-time preview).
  router.get('/price-list', (_req, res) => {
    res.json(defaultPriceList);
  });

  // Create a group; snapshot the current global price list into it.
  router.post('/groups', (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Retry on the rare code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      if (repo.getGroupRow(code)) continue;
      repo.createGroup({ code, name, priceList: defaultPriceList });
      return res.status(201).json({ code, name, priceList: defaultPriceList });
    }
    return res.status(500).json({ error: 'could not allocate a group code' });
  });

  // Full shared state — the client polls this.
  router.get('/groups/:code', (req, res) => {
    const state = repo.getGroupState(req.params.code.toUpperCase());
    if (!state) return res.status(404).json({ error: 'group not found' });
    res.json(state);
  });

  // Run optimizer + split over the current state.
  router.post('/groups/:code/result', (req, res) => {
    const code = req.params.code.toUpperCase();
    const state = repo.getGroupState(code);
    if (!state) return res.status(404).json({ error: 'group not found' });

    const result = computeResult(state);
    const split = computeSplit(result);
    if (req.query.finalize === 'true') repo.setGroupStatus(code, 'finalized');
    res.json({ ...result, perMember: split.perMember });
  });

  return router;
}
