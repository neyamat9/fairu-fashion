"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Generic localStorage hook with try/catch fallback to in-memory state.
 * Safely handles SSR (no window), JSON parse errors, and storage quota errors.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Read from localStorage on first render (client only)
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Sync state when key changes (e.g. different user session)
  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // Dispatch storage event so other tabs/hooks can react
          window.dispatchEvent(new Event("local-storage"));
        }
      } catch {
        // Quota exceeded or private browsing — fall back to in-memory state only
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
        window.dispatchEvent(new Event("local-storage"));
      }
    } catch {
      // ignore
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  // Listen for changes from other tabs / other hook instances
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | Event) => {
      if (event instanceof StorageEvent) {
        if (event.key && event.key !== key) return;
      }
      setStoredValue(readValue());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, readValue]);

  return [storedValue, setValue, removeValue];
}
