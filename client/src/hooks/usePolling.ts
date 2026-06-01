import { useEffect, useRef, useState, useCallback } from 'react';

// Polls an async fetcher on an interval and exposes the latest value. Used to
// keep the "Everyone" list near-live without websockets.
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      setData(await fetcherRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refresh();
    const id = setInterval(() => {
      if (active) void refresh();
    }, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [refresh, intervalMs]);

  return { data, error, refresh };
}
