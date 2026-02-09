import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppSettingsMap } from '../types/admin';

// Module-level cache shared across all hook instances
const cache: Record<string, { value: unknown; fetchedAt: number }> = {};
const CACHE_TTL = 60_000; // 1 minute

// Track in-flight promises to avoid duplicate fetches
const pending: Record<string, Promise<unknown>> = {};

// Listeners for cache invalidation (re-fetch on demand)
const listeners: Record<string, Set<() => void>> = {};

/** Clear cached value for a key so the next read fetches fresh data */
export function invalidateAppSetting(key: string) {
  delete cache[key];
  listeners[key]?.forEach((cb) => cb());
}

async function fetchSetting<K extends keyof AppSettingsMap>(key: K): Promise<AppSettingsMap[K] | undefined> {
  const now = Date.now();
  const cached = cache[key];
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.value as AppSettingsMap[K];
  }

  // Dedupe concurrent requests for the same key
  if (key in pending) {
    return pending[key] as Promise<AppSettingsMap[K] | undefined>;
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error || !data) {
        // Cache failures with short 5s TTL to prevent re-render spam
        cache[key] = { value: undefined, fetchedAt: Date.now() - (CACHE_TTL - 5_000) };
        return undefined;
      }

      // Parse the value — app_settings stores values as text
      let parsed: unknown = data.value;
      if (parsed === 'true') parsed = true;
      else if (parsed === 'false') parsed = false;
      else if (typeof parsed === 'string' && /^\d+$/.test(parsed)) parsed = Number(parsed);

      cache[key] = { value: parsed, fetchedAt: Date.now() };
      return parsed as AppSettingsMap[K];
    } catch {
      return undefined;
    } finally {
      delete pending[key];
    }
  })();

  pending[key] = promise;
  return promise;
}

export function useAppSetting<K extends keyof AppSettingsMap>(key: K) {
  const [value, setValue] = useState<AppSettingsMap[K] | undefined>(() => {
    const cached = cache[key];
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.value as AppSettingsMap[K];
    }
    return undefined;
  });
  const [isLoading, setIsLoading] = useState(!cache[key]);

  useEffect(() => {
    let cancelled = false;

    fetchSetting(key).then((result) => {
      if (!cancelled) {
        setValue(result);
        setIsLoading(false);
      }
    });

    // Subscribe to invalidation events so admin saves propagate instantly
    const refetch = () => {
      fetchSetting(key).then((result) => {
        if (!cancelled) setValue(result);
      });
    };
    if (!listeners[key]) listeners[key] = new Set();
    listeners[key].add(refetch);

    return () => {
      cancelled = true;
      listeners[key]?.delete(refetch);
    };
  }, [key]);

  return { value, isLoading };
}
