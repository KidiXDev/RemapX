import { useCallback, useState } from 'react';

/**
 * Hook for managing dialog, modal, drawer, or toggle open/close states.
 */
export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    onOpen,
    onClose,
    onToggle,
    setIsOpen
  };
}
