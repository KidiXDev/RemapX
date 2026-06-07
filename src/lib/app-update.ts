const LATEST_RELEASE_URL =
  'https://api.github.com/repos/KidiXDev/RemapX/releases/latest';
const AVAILABLE_UPDATE_STORAGE_KEY = 'app:available-update-tag';

export interface AppUpdateInfo {
  latestTag: string;
  hasUpdate: boolean;
}

const cleanVersion = (value: string) => value.replace(/^v/, '').trim();

const splitVersion = (value: string) => cleanVersion(value).split('.').map(Number);

export const isNewerVersion = (
  currentVersion: string,
  latestVersion: string,
  options?: { treatDevAsUpdate?: boolean }
) => {
  if (currentVersion === 'dev') {
    return options?.treatDevAsUpdate ?? false;
  }

  const currentParts = splitVersion(currentVersion);
  const latestParts = splitVersion(latestVersion);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (latestPart > currentPart) return true;
    if (currentPart > latestPart) return false;
  }

  return false;
};

export const checkForAppUpdate = async (
  options?: { treatDevAsUpdate?: boolean }
): Promise<AppUpdateInfo> => {
  const response = await fetch(LATEST_RELEASE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch latest release');
  }

  const data = await response.json();
  const latestTag = String(data.tag_name ?? '').trim();

  if (!latestTag) {
    throw new Error('Missing latest release tag');
  }

  return {
    latestTag,
    hasUpdate: isNewerVersion(__APP_VERSION__, latestTag, options)
  };
};

export const getCachedAvailableUpdateTag = () => {
  if (typeof window === 'undefined') return null;

  const latestTag = window.localStorage.getItem(AVAILABLE_UPDATE_STORAGE_KEY)?.trim();
  if (!latestTag) return null;

  if (!isNewerVersion(__APP_VERSION__, latestTag)) {
    window.localStorage.removeItem(AVAILABLE_UPDATE_STORAGE_KEY);
    return null;
  }

  return latestTag;
};

export const cacheAvailableUpdate = (latestTag: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AVAILABLE_UPDATE_STORAGE_KEY, latestTag);
};

export const clearCachedAvailableUpdate = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AVAILABLE_UPDATE_STORAGE_KEY);
};

export const getTodayStorageKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
