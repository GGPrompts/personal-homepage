import { useState, useEffect, useCallback } from 'react';

interface UseTabzConnectionResult {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  queue: (command: string) => void;  // Send command to active kitty terminal
  spawn: (options: { name?: string; workingDir?: string; command?: string }) => Promise<boolean>;
}

/**
 * Hook for kitty terminal integration in the flowchart editor.
 * - spawn(): Opens a new kitty window via POST /api/terminal
 * - queue(): Sends a command to the active kitty window via PUT /api/terminal
 */
export function useTabzConnection(): UseTabzConnectionResult {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Probe /api/terminal to verify kitty is available
  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      try {
        const res = await fetch('/api/terminal');
        if (!cancelled) {
          if (res.ok) {
            setConnected(true);
            setError(null);
          } else {
            setConnected(false);
            setError('Terminal API not available');
          }
          setConnecting(false);
        }
      } catch {
        if (!cancelled) {
          setConnected(false);
          setError('Cannot reach terminal API');
          setConnecting(false);
        }
      }
    };

    probe();
    return () => { cancelled = true; };
  }, []);

  const spawn = useCallback(async (options: { name?: string; workingDir?: string; command?: string }) => {
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: options.command,
          workingDir: options.workingDir,
          name: options.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnected(true);
        setError(null);
        return true;
      }
      setError(data.error || 'Failed to spawn terminal');
      return false;
    } catch {
      setConnected(false);
      setError('Terminal API unreachable');
      return false;
    }
  }, []);

  const queue = useCallback((command: string) => {
    fetch('/api/terminal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: command }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          console.warn('[useTabzConnection] queue failed:', data.error);
        }
      })
      .catch(err => {
        console.warn('[useTabzConnection] queue error:', err);
      });
  }, []);

  return { connected, connecting, error, queue, spawn };
}
