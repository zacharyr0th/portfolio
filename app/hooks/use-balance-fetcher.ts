import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/utils/core/logger";

// Constants
const MIN_REFRESH_INTERVAL = 60000; // 60 seconds
const CACHE_DURATION = 120000; // 2 minutes
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map<string, Promise<any>>();

interface BalanceCache<T> {
  data: T;
  timestamp: number;
  error?: string;
}

interface UseBalanceFetcherOptions<T> {
  accountId: string;
  fetchFn: () => Promise<T>;
  onSuccess?: (data: T) => void;
  enabled?: boolean;
  minRefreshInterval?: number;
  cacheDuration?: number;
}

interface UseBalanceFetcherResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

// Global cache store with request deduplication
const balanceCache = new Map<string, BalanceCache<any>>();

// Cleanup old cache entries periodically
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of balanceCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      balanceCache.delete(key);
    }
  }
  // Also cleanup ongoing requests
  for (const [key, promise] of ongoingRequests.entries()) {
    promise.then(() => ongoingRequests.delete(key));
  }
};

// Set up periodic cache cleanup
if (typeof window !== "undefined") {
  setInterval(cleanupCache, CACHE_DURATION);
}

export function useBalanceFetcher<T>({
  accountId,
  fetchFn,
  onSuccess,
  enabled = true,
  minRefreshInterval = MIN_REFRESH_INTERVAL,
  cacheDuration = CACHE_DURATION,
}: UseBalanceFetcherOptions<T>): UseBalanceFetcherResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchTime = useRef(0);
  const retryCount = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (force = false): Promise<void> => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;

      // Check if we should skip fetching
      if (!force && timeSinceLastFetch < minRefreshInterval) {
        return;
      }

      // Check cache first
      const cached = balanceCache.get(accountId);
      if (!force && cached && now - cached.timestamp < cacheDuration) {
        setData(cached.data);
        setError(cached.error || null);
        return;
      }

      // Check for ongoing request for this account
      const ongoingRequest = ongoingRequests.get(accountId);
      if (ongoingRequest) {
        try {
          const result = await ongoingRequest;
          setData(result);
          setError(null);
          if (onSuccess) {
            onSuccess(result);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
        }
        return;
      }

      // Cancel any existing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      // Create the fetch promise
      const fetchPromise = (async () => {
        try {
          // Set up timeout
          const timeoutId = setTimeout(() => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
          }, REQUEST_TIMEOUT);

          const result = await fetchFn();

          clearTimeout(timeoutId);

          // Update cache
          balanceCache.set(accountId, {
            data: result,
            timestamp: now,
          });

          setData(result);
          setError(null);
          retryCount.current = 0;
          lastFetchTime.current = now;

          if (onSuccess) {
            onSuccess(result);
          }

          return result;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.warn(
            `Error fetching balance data (${accountId}): ${errorMessage}`,
          );

          // Update cache with error
          const cached = balanceCache.get(accountId);
          if (cached) {
            cached.error = errorMessage;
            balanceCache.set(accountId, cached);
          }

          setError(errorMessage);

          // Implement retry logic
          if (retryCount.current < MAX_RETRIES) {
            const nextRetryDelay =
              RETRY_DELAY * Math.pow(2, retryCount.current);
            retryCount.current += 1;
            setTimeout(() => fetchData(true), nextRetryDelay);
          }

          throw err;
        } finally {
          setIsLoading(false);
          abortControllerRef.current = null;
          ongoingRequests.delete(accountId);
        }
      })();

      // Store the promise in ongoingRequests
      ongoingRequests.set(accountId, fetchPromise);

      // Wait for the fetch to complete but don't return its value
      await fetchPromise;
    },
    [accountId, fetchFn, onSuccess, minRefreshInterval, cacheDuration],
  );

  // Set up polling
  useEffect(() => {
    if (!enabled) return;

    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, minRefreshInterval);

    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchData, minRefreshInterval]);

  return {
    data,
    error,
    isLoading,
    refetch: () => fetchData(true),
  };
}
