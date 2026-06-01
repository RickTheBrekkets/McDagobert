import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createRepo } from './db.js';

function freshApp() {
  // Each test gets its own in-memory database.
  return createApp(createRepo(':memory:'));
}

describe('McDagobert API', () => {
  let app: ReturnType<typeof freshApp>;
  beforeEach(() => {
    app = freshApp();
  });

  it('runs the full create -> join -> order -> result flow', async () => {
    const created = await request(app).post('/api/groups').send({ name: 'Lunch' });
    expect(created.status).toBe(201);
    const code = created.body.code as string;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    const alice = await request(app)
      .post(`/api/groups/${code}/members`)
      .send({ name: 'Alice' });
    const bob = await request(app)
      .post(`/api/groups/${code}/members`)
      .send({ name: 'Bob' });
    expect(alice.status).toBe(201);

    await request(app)
      .post(`/api/members/${alice.body.memberId}/items`)
      .set('x-device-token', alice.body.deviceToken)
      .send({ itemName: 'Big Mac', qty: 1 });
    await request(app)
      .post(`/api/members/${bob.body.memberId}/items`)
      .set('x-device-token', bob.body.deviceToken)
      .send({ itemName: 'Medium Fries', qty: 1 });
    await request(app)
      .post(`/api/members/${bob.body.memberId}/items`)
      .set('x-device-token', bob.body.deviceToken)
      .send({ itemName: 'Medium Coke', qty: 1 });

    const state = await request(app).get(`/api/groups/${code}`);
    expect(state.status).toBe(200);
    expect(state.body.members).toHaveLength(2);

    const result = await request(app).post(`/api/groups/${code}/result`);
    expect(result.status).toBe(200);
    // Big Mac Menu forms from Alice's Big Mac + Bob's fries & coke.
    expect(result.body.total).toBe(8.5);
    const total = result.body.perMember.reduce(
      (s: number, m: { amount: number }) => s + Math.round(m.amount * 100),
      0,
    );
    expect(total).toBe(850);
  });

  it('resumes an existing member when the device token matches', async () => {
    const { body: g } = await request(app).post('/api/groups').send({ name: 'G' });
    const first = await request(app)
      .post(`/api/groups/${g.code}/members`)
      .send({ name: 'Alice' });
    const again = await request(app)
      .post(`/api/groups/${g.code}/members`)
      .send({ name: 'Alice 2', deviceToken: first.body.deviceToken });
    expect(again.body.memberId).toBe(first.body.memberId);
  });

  it('rejects items from a different device token', async () => {
    const { body: g } = await request(app).post('/api/groups').send({ name: 'G' });
    const alice = await request(app)
      .post(`/api/groups/${g.code}/members`)
      .send({ name: 'Alice' });
    const res = await request(app)
      .post(`/api/members/${alice.body.memberId}/items`)
      .set('x-device-token', 'someone-else')
      .send({ itemName: 'Big Mac', qty: 1 });
    expect(res.status).toBe(403);
  });

  it('rejects unknown items and bad quantities', async () => {
    const { body: g } = await request(app).post('/api/groups').send({ name: 'G' });
    const alice = await request(app)
      .post(`/api/groups/${g.code}/members`)
      .send({ name: 'Alice' });
    const token = alice.body.deviceToken;

    const unknown = await request(app)
      .post(`/api/members/${alice.body.memberId}/items`)
      .set('x-device-token', token)
      .send({ itemName: 'Quarter Pounder', qty: 1 });
    expect(unknown.status).toBe(400);

    const badQty = await request(app)
      .post(`/api/members/${alice.body.memberId}/items`)
      .set('x-device-token', token)
      .send({ itemName: 'Big Mac', qty: 0 });
    expect(badQty.status).toBe(400);
  });

  it('404s for an unknown group', async () => {
    const res = await request(app).get('/api/groups/ZZZZZZ');
    expect(res.status).toBe(404);
  });
});
