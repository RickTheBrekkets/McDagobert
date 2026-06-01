# McDagobert

Create a group, share a link, and let everyone add what they want from
McDonald's on their own phone. McDagobert figures out the **cheapest way** to
buy it all (using value-meal combos vs. single items) and **splits the bill**
fairly — each combo's price is shared by exactly the people whose items formed
that deal.

The name is a pun: McDonald's + *Dagobert* (Scrooge McDuck) — McDonald's for
people who hate overpaying.

## How it works

1. A host creates a group and gets a short share code / link.
2. Everyone opens the link on their phone, enters their name, and adds items.
   The "Everyone" list updates by polling so you can watch orders come in.
3. Tap **Compute** to see the optimised till order and a per-person breakdown.

### The optimiser

`shared/optimizer.ts` finds the cheapest combination of combos and singles with
a memoised dynamic-programming search (a hardened version of the original
prototype in `public/app.js`), then **recovers provenance** — which person's
item filled each slot of each chosen combo. That provenance is what makes a fair
split possible.

### The split

`shared/split.ts` charges each single fully to its owner and divides each
combo's price among its slot owners in proportion to à-la-carte value. A
largest-remainder (Hamilton) rounding pass guarantees the per-person amounts sum
to the total exactly, to the cent.

## Project layout

```
shared/   Pure TypeScript: types, optimiser, bill-split (unit-tested, no I/O)
server/   Express + better-sqlite3 REST API (also serves the built client)
client/   Vite + React + TypeScript mobile-first SPA
public/   The original single-device prototype, kept for reference
```

State lives in a self-contained SQLite file (`mcdagobert.db`); no external
accounts or services are required.

## Running it

```bash
npm install

# Dev: Express on :3001, Vite on :5173 (proxies /api to the server)
npm run dev

# Production: build everything, then the server serves the client too
npm run build
npm start        # http://localhost:3001
```

Open the app, create a group, and share the link. To try it solo, open the
share link in several browser tabs / private windows (each tab is treated as a
separate device).

## Tests

```bash
npm test
```

Covers optimiser cost/provenance, the split math (worked examples + a
sum-to-total property test), and the full create → join → order → result API
flow against an in-memory database.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/price-list` | global default menu |
| `POST` | `/api/groups` | create a group, returns its code |
| `GET` | `/api/groups/:code` | full group state (polled by the client) |
| `POST` | `/api/groups/:code/members` | join / resume (via `deviceToken`) |
| `POST` | `/api/members/:id/items` | add an item (owner's `x-device-token` required) |
| `PATCH` | `/api/items/:id` | update quantity |
| `DELETE` | `/api/items/:id` | remove an item |
| `POST` | `/api/groups/:code/result` | optimise + split the current order |

The menu and combo deals can be edited in `shared/defaultPriceList.ts`; each
group snapshots the price list at creation so results stay reproducible.

## Deployment note

SQLite stores data in a single file on disk, so deploy where that file
persists. Swapping to Postgres later is mechanical — all database access is
behind the repository in `server/src/db.ts`.
