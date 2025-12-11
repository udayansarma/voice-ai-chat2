// src/utils/localStorage.ts
// Utility for type-safe localStorage access with error handling and versioning

export interface StorageOptions<T> {
  version?: number;
  migrate?: (oldValue: any) => T;
}

export function setItem<T>(key: string, value: T, options?: StorageOptions<T>): void {
  try {
    const payload = {
      v: options?.version ?? 1,
      data: value
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    // Optionally log error
  }
}

export function getItem<T>(key: string, options?: StorageOptions<T>): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (options?.version && payload.v !== options.version && options.migrate) {
      // Migrate old data
      const migrated = options.migrate(payload.data);
      setItem(key, migrated, options);
      return migrated;
    }
    return payload.data as T;
  } catch {
    return null;
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function clearObsoleteKeys(validKeys: string[]): void {
  try {
    Object.keys(localStorage).forEach(key => {
      if (!validKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
}
