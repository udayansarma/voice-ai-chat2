// src/hooks/usePersistentState.ts
import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getItem, setItem, removeItem } from '../utils/localStorage';
import type { StorageOptions } from '../utils/localStorage';

/**
 * usePersistentState - React hook for syncing state with localStorage
 * @param key localStorage key
 * @param initialValue initial value if nothing in storage
 * @param options versioning/migration options
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    const stored = getItem<T>(key, options);
    return stored !== null ? stored : initialValue;
  });

  useEffect(() => {
    setItem<T>(key, state, options);
  }, [key, state, options]);

  // Remove from storage and reset to initial value
  const reset = () => {
    removeItem(key);
    setState(initialValue);
  };

  // Listen for storage changes in other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) {
        const newValue = getItem<T>(key, options);
        setState(newValue !== null ? newValue : initialValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, options, initialValue]);

  return [state, setState, reset];
}
