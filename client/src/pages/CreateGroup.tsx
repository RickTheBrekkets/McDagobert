import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export function CreateGroup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const group = await api.createGroup(name.trim());
      navigate(`/g/${group.code}/join`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create group');
    } finally {
      setBusy(false);
    }
  }

  function join() {
    const code = joinCode.trim().toUpperCase();
    if (code) navigate(`/g/${code}/join`);
  }

  return (
    <main className="screen">
      <h1 className="brand">🍔 McDagobert</h1>
      <p className="tagline">Order together, pay your fair share.</p>

      <section className="card">
        <h2>Start a group</h2>
        <input
          className="input"
          placeholder="Group name (e.g. Friday lunch)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <button className="btn primary" onClick={create} disabled={busy}>
          {busy ? 'Creating…' : 'Create group'}
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Join with a code</h2>
        <input
          className="input code-input"
          placeholder="ABC123"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <button className="btn" onClick={join}>
          Join
        </button>
      </section>
    </main>
  );
}
