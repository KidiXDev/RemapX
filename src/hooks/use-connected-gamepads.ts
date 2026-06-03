import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface ConnectedGamepad {
  id: string;
  name: string;
}

/**
 * Hook to fetch, signature-match, and poll connected gamepads from Tauri using React Query.
 *
 * @param pollIntervalMs Interval in milliseconds to poll the gamepad state silently. Set to 0 to disable polling.
 */
export function useConnectedGamepads(pollIntervalMs = 1500) {
  const { data: gamepads = [], isLoading, refetch } = useQuery<ConnectedGamepad[]>({
    queryKey: ['connected-gamepads'],
    queryFn: () => invoke<ConnectedGamepad[]>('get_connected_gamepads'),
    refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
    staleTime: pollIntervalMs > 0 ? pollIntervalMs : Infinity,
  });

  return {
    gamepads,
    isLoading,
    refresh: async () => {
      await refetch();
    }
  };
}
