import { useState, useCallback } from 'react';

/**
 * Custom hook for managing expanded state of multiple accordions using a Set.
 */
export function useAccordionState(initial: string[] = []) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initial));

  const isExpanded = useCallback((panel: string) => expanded.has(panel), [expanded]);

  const handleChange = useCallback(
    (panel: string) => (_: React.SyntheticEvent, isPanelExpanded: boolean) => {
      setExpanded(prev => {
        const next = new Set(prev);
        if (isPanelExpanded) {
          next.add(panel);
        } else {
          next.delete(panel);
        }
        return next;
      });
    },
    []
  );

  const setPanels = useCallback((panels: string[]) => {
    setExpanded(new Set(panels));
  }, []);

  return { expanded, isExpanded, handleChange, setPanels };
}
