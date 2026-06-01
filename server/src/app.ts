import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Repo } from './db.js';
import { groupRoutes } from './routes/groups.js';
import { memberRoutes } from './routes/members.js';
import { itemRoutes } from './routes/items.js';

// App factory so tests can inject an in-memory repo.
export function createApp(repo: Repo): Express {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', groupRoutes(repo));
  app.use('/api', memberRoutes(repo));
  app.use('/api', itemRoutes(repo));

  // In production, serve the built client and fall back to index.html so the
  // SPA's deep links (e.g. /g/ABC123) work on refresh. No-op if not built yet.
  const clientDist = join(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(join(clientDist, 'index.html'));
    });
  }

  return app;
}
