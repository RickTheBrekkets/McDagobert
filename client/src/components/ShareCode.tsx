import { useState } from 'react';

// Shows the join code and a copy-link button so the host can invite people.
export function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/g/${code}/join`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; the code is shown regardless */
    }
  }

  return (
    <div className="share">
      <span className="muted">Invite code</span>
      <strong className="code-pill">{code}</strong>
      <button className="btn small" onClick={copy}>
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
