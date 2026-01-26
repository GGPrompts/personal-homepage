import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFileStorageOptions<T> {
  fallbackKey?: string;  // localStorage key for fallback
  initialValue?: T;      // Default value if nothing exists
}

interface UseFileStorageReturn<T> {
  data: T | null;
  setData: (value: T) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook that stores data in files via API, with localStorage fallback
 *
 * Mirrors useLocalStorage behavior but writes to files via Vite API plugin.
 * Falls back to localStorage if API is unavailable.
 *
 * @param endpoint - API endpoint (e.g., "/api/workflows")
 * @param options - Configuration options
 * @returns Object with data, setData, isLoading, error, and refresh
 */
export function useFileStorage<T>(
  endpoint: string,
  options: UseFileStorageOptions<T> = {}
): UseFileStorageReturn<T> {
  const { fallbackKey, initialValue } = options;

  // Use refs to avoid dependency issues with callbacks
  const fallbackKeyRef = useRef(fallbackKey);
  const initialValueRef = useRef(initialValue);
  const endpointRef = useRef(endpoint);

  // Update refs when props change
  fallbackKeyRef.current = fallbackKey;
  initialValueRef.current = initialValue;
  endpointRef.current = endpoint;

  const [data, setDataState] = useState<T | null>(initialValue ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if we're using fallback mode (API unavailable)
  const usingFallbackRef = useRef(false);
  // Track if initial fetch has been done
  const hasFetchedRef = useRef(false);

  // Read from localStorage fallback
  const readFromFallback = useCallback((): T | null => {
    const key = fallbackKeyRef.current;
    const initial = initialValueRef.current;
    if (!key) return initial ?? null;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : (initial ?? null);
    } catch (err) {
      console.warn(`Error reading localStorage fallback "${key}":`, err);
      return initial ?? null;
    }
  }, []);

  // Write to localStorage fallback
  const writeToFallback = useCallback((value: T): void => {
    const key = fallbackKeyRef.current;
    if (!key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Error writing localStorage fallback "${key}":`, err);
    }
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async (): Promise<void> => {
    const currentEndpoint = endpointRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(currentEndpoint);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setDataState(result);
      usingFallbackRef.current = false;

      // Also update localStorage as backup
      writeToFallback(result);
    } catch (err) {
      console.warn(`API fetch failed for "${currentEndpoint}", using fallback:`, err);

      // Fall back to localStorage
      const fallbackData = readFromFallback();
      setDataState(fallbackData);
      usingFallbackRef.current = true;

      // Only set error if we have no data at all
      if (fallbackData === null && initialValueRef.current === undefined) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  }, [readFromFallback, writeToFallback]);

  // Initial fetch on mount only
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  // Set data function - writes to API with optimistic update
  const setData = useCallback(async (value: T): Promise<void> => {
    const currentEndpoint = endpointRef.current;

    // Optimistic update - update state immediately
    setDataState(value);
    setError(null);

    // Always update localStorage as backup
    writeToFallback(value);

    // If we're in fallback mode, don't try API
    if (usingFallbackRef.current) {
      return;
    }

    try {
      const response = await fetch(currentEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.warn(`API write failed for "${currentEndpoint}":`, err);

      // Switch to fallback mode for future operations
      usingFallbackRef.current = true;

      // Data is already in localStorage, so we don't need to rollback
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [writeToFallback]);

  // Refresh function to re-fetch from API
  const refresh = useCallback(async (): Promise<void> => {
    usingFallbackRef.current = false;
    await fetchData();
  }, [fetchData]);

  return { data, setData, isLoading, error, refresh };
}

/**
 * Tuple-based version for drop-in replacement compatibility
 * Returns [data, setData, isLoading, error]
 */
export function useFileStorageTuple<T>(
  endpoint: string,
  options: UseFileStorageOptions<T> = {}
): [T | null, (value: T) => Promise<void>, boolean, Error | null] {
  const { data, setData, isLoading, error } = useFileStorage<T>(endpoint, options);
  return [data, setData, isLoading, error];
}

/**
 * Hook for individual item operations within a collection
 * Useful for CRUD operations on specific workflow items
 */
export function useFileStorageItem<T extends { id: string }>(
  baseEndpoint: string,
  itemId: string | null,
  options: UseFileStorageOptions<T> = {}
): UseFileStorageReturn<T> {
  const endpoint = itemId ? `${baseEndpoint}/${itemId}` : baseEndpoint;
  return useFileStorage<T>(endpoint, options);
}
