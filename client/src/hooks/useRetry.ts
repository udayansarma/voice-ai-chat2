import { useState, useCallback } from 'react';

interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
}

export const useRetry = ({ maxAttempts = 3, delayMs = 1000 }: RetryConfig = {}) => {
  const [attemptCount, setAttemptCount] = useState(0);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> => {
    try {
      const result = await operation();
      setAttemptCount(0); // Reset on success
      return result;
    } catch (error) {
      setAttemptCount(count => {
        const nextCount = count + 1;
        if (nextCount < maxAttempts) {
          // If we haven't reached max attempts, wait and try again
          setTimeout(async () => {
            try {
              await operation();
              setAttemptCount(0); // Reset on success
            } catch (retryError) {
              onError?.(retryError as Error, nextCount);
            }
          }, delayMs);
        }
        return nextCount;
      });
      
      throw error;
    }
  }, [maxAttempts, delayMs]);

  return {
    executeWithRetry,
    attemptCount,
    hasMoreAttempts: attemptCount < maxAttempts
  };
};
