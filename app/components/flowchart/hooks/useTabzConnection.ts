import { useState, useEffect, useCallback, useRef } from 'react';

const TABZ_URL = 'http://localhost:8129';
const WS_URL = 'ws://localhost:8129/ws/extension';

interface UseTabzConnectionResult {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  queue: (command: string) => void;  // Send command to current terminal
  spawn: (options: { name?: string; workingDir?: string; command?: string }) => Promise<boolean>;
}

export function useTabzConnection(): UseTabzConnectionResult {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connectWebSocket = useCallback((token: string) => {
    // Don't attempt to connect if we already have an open connection
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    ws.onclose = () => {
      setConnected(false);
      // Try to reconnect after 3 seconds
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (tokenRef.current) {
          connectWebSocket(tokenRef.current);
        }
      }, 3000);
    };

    ws.onerror = () => {
      setError('WebSocket error');
    };

    wsRef.current = ws;
  }, []);

  // Fetch auth token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setConnecting(true);
        const res = await fetch(`${TABZ_URL}/api/auth/token`);
        if (res.ok) {
          const data = await res.json();
          tokenRef.current = data.token;
          connectWebSocket(data.token);
        } else {
          setError('TabzChrome not available');
          setConnecting(false);
        }
      } catch {
        setError('Cannot connect to TabzChrome');
        setConnecting(false);
      }
    };
    fetchToken();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const queue = useCallback((command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'QUEUE_COMMAND',
        command
      }));
    }
  }, []);

  const spawn = useCallback(async (options: { name?: string; workingDir?: string; command?: string }) => {
    if (!tokenRef.current) return false;

    try {
      const res = await fetch(`${TABZ_URL}/api/spawn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': tokenRef.current
        },
        body: JSON.stringify(options)
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return { connected, connecting, error, queue, spawn };
}
