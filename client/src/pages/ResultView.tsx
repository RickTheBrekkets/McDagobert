import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GroupState } from '@mcdagobert/shared';
import { api, type ResultResponse } from '../api.js';

export function ResultView() {
  const { code = '' } = useParams();
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [group, setGroup] = useState<GroupState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [g, r] = await Promise.all([api.getGroup(code), api.computeResult(code)]);
      setGroup(g);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compute');
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameOf = (id: number) =>
    group?.members.find((m) => m.id === id)?.name ?? `#${id}`;

  if (error) return <main className="screen"><p className="error">{error}</p></main>;
  if (!result || !group) return <main className="screen"><p className="muted">Crunching the numbers…</p></main>;

  const combos = result.purchases.filter((p) => p.kind === 'combo');
  const singles = result.purchases.filter((p) => p.kind === 'single');

  return (
    <main className="screen">
      <header className="group-header">
        <h1>{group.name} — split</h1>
        <Link className="btn small" to={`/g/${code}`}>
          ← Back
        </Link>
      </header>

      <section className="card totals">
        <div>
          <span className="muted">Total</span>
          <strong className="big-number">€{result.total.toFixed(2)}</strong>
        </div>
        <div>
          <span className="muted">À-la-carte</span>
          <span>€{result.alaCarteTotal.toFixed(2)}</span>
        </div>
        <div className="savings">
          <span className="muted">You save</span>
          <strong>€{result.savings.toFixed(2)}</strong>
        </div>
      </section>

      <section className="card">
        <h2>Who pays what</h2>
        <ul className="item-list">
          {result.perMember.map((m) => (
            <li key={m.memberId} className="item-row">
              <span className="item-name">{nameOf(m.memberId)}</span>
              <strong className="price">€{m.amount.toFixed(2)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>What to order at the till</h2>
        {combos.map((p, i) =>
          p.kind === 'combo' ? (
            <div key={i} className="till-line">
              <strong>{p.comboName}</strong> — €{p.price.toFixed(2)}
              <ul className="dense">
                {p.slots.map((s, j) => (
                  <li key={j}>
                    {s.itemName} <span className="muted">({nameOf(s.owner)})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
        {singles.length > 0 && (
          <div className="till-line">
            <strong>Singles</strong>
            <ul className="dense">
              {singles.map((p, i) =>
                p.kind === 'single' ? (
                  <li key={i}>
                    {p.itemName} — €{p.price.toFixed(2)}{' '}
                    <span className="muted">({nameOf(p.owner)})</span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
