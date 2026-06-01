import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { loadIdentity, saveIdentity } from '../lib/device.js';

export function JoinGroup() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If this device already joined, skip straight to the order screen.
  useEffect(() => {
    if (loadIdentity(code)) {
      navigate(`/g/${code}`, { replace: true });
      return;
    }
    api
      .getGroup(code)
      .then((g) => setGroupName(g.name))
      .catch(() => setError('Group not found. Check the code.'));
  }, [code, navigate]);

  async function join() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { memberId, deviceToken } = await api.joinGroup(code, name.trim());
      saveIdentity(code, { memberId, deviceToken, name: name.trim() });
      navigate(`/g/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <h1 className="brand">🍔 McDagobert</h1>
      <section className="card">
        <h2>{groupName ? `Join "${groupName}"` : 'Join group'}</h2>
        <p className="muted">Group code: <strong>{code}</strong></p>
        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <button className="btn primary" onClick={join} disabled={busy}>
          {busy ? 'Joining…' : 'Join'}
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
