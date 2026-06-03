import { Event, listen } from '@tauri-apps/api/event';
import { useEffect, useRef } from 'react';

/**
 * React hook to subscribe to Tauri backend events with automatic cleanup.
 *
 * @param eventName Name of the tauri event (e.g. 'gamepad-button-state')
 * @param handler Callback triggered when the event fires
 * @param deps Dependency array to re-bind the listener if variables change
 */
export function useTauriEvent<T>(
  eventName: string,
  handler: (event: Event<T>) => void,
  deps: any[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const fn = await listen<T>(eventName, (event) => {
          handlerRef.current(event);
        });
        unlisten = fn;
      } catch (err) {
        console.error(`Failed to listen to Tauri event "${eventName}":`, err);
      }
    };

    void setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, ...deps]);
}
