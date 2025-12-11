import { useState, useCallback } from 'react';

/**
 * Custom hook for managing copy-to-clipboard Snackbar state.
 */
export function useCopySnackbar(): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  return [open, show, close];
}
