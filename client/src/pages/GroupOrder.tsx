import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { usePolling } from '../hooks/usePolling.js';
import { loadIdentity } from '../lib/device.js';
import { ShareCode } from '../components/ShareCode.js';
import { MemberOrderEditor } from '../components/MemberOrderEditor.js';
import { EveryoneList } from '../components/EveryoneList.js';

export function GroupOrder() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const identity = loadIdentity(code);

  const fetcher = useCallback(() => api.getGroup(code), [code]);
  const { data: group, error, refresh } = usePolling(fetcher, 4000);

  if (!identity) {
    navigate(`/g/${code}/join`, { replace: true });
    return null;
  }
  if (error) return <main className="screen"><p className="error">{error}</p></main>;
  if (!group) return <main className="screen"><p className="muted">Loading…</p></main>;

  const me = group.members.find((m) => m.id === identity.memberId);

  return (
    <main className="screen">
      <header className="group-header">
        <h1>{group.name}</h1>
        <ShareCode code={group.code} />
      </header>

      {me && (
        <MemberOrderEditor
          member={me}
          token={identity.deviceToken}
          priceList={group.priceList}
          onChange={refresh}
        />
      )}

      <EveryoneList members={group.members} youId={identity.memberId} />

      <button
        className="btn primary big"
        onClick={() => navigate(`/g/${code}/result`)}
      >
        Compute cheapest order & split
      </button>
    </main>
  );
}
