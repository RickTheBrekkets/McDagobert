import type { Member } from '@mcdagobert/shared';

// Read-only roll-up of what everyone in the group has ordered so far.
export function EveryoneList({ members, youId }: { members: Member[]; youId: number }) {
  return (
    <section className="card">
      <h2>Everyone ({members.length})</h2>
      {members.map((m) => (
        <div key={m.id} className="member-block">
          <h3>
            {m.name}
            {m.id === youId && <span className="you-tag">you</span>}
          </h3>
          {m.items.length === 0 ? (
            <p className="muted small">no items yet</p>
          ) : (
            <ul className="dense">
              {m.items.map((it) => (
                <li key={it.id}>
                  {it.qty}× {it.itemName}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
