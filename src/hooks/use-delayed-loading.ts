import { useEffect, useState } from 'react';

/**
 * Hook to delay showing a loading indicator to prevent flashing/blinking.
 *
 * @param isLoading The raw loading state (e.g. from an API request)
 * @param delayMs Delay in milliseconds before setting showLoading to true
 */
export function useDelayedLoading(isLoading: boolean, delayMs = 150): boolean {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return showLoading;
}
