import { Router } from 'express';
import type { Repo } from '../db.js';
import { generateDeviceToken } from '../codes.js';

export function memberRoutes(repo: Repo): Router {
  const router = Router();

  // Join a group, or resume as an existing member when the device token matches.
  router.post('/groups/:code/members', (req, res) => {
    const code = req.params.code.toUpperCase();
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const deviceToken =
      typeof req.body?.deviceToken === 'string' && req.body.deviceToken
        ? req.body.deviceToken
        : generateDeviceToken();

    const result = repo.upsertMember({ code, name, deviceToken });
    if (!result) return res.status(404).json({ error: 'group not found' });
    res.status(201).json(result);
  });

  return router;
}
