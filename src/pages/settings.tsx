import { Button, ToggleSwitch } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Select } from '@/components/common/select';
import { ContentLayout } from '@/components/layout/content-layout';
import { useConfirm } from '@/components/providers/confirmation-provider';
import {
  cacheAvailableUpdate,
  checkForAppUpdate,
  clearCachedAvailableUpdate,
  getCachedAvailableUpdateTag
} from '@/lib/app-update';
import {
  LocaleType,
  ThemeType,
  useSettingsStore
} from '@/hooks/use-settings-store';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function Settings() {
  const { t } = useTranslation('settings');
  const confirm = useConfirm();
  const [isChecking, setIsChecking] = useState(false);
  const [cachedUpdateTag, setCachedUpdateTag] = useState<string | null>(null);
  const {
    isPortable,
    runOnBoot,
    startMinimized,
    minimizeToTray,
    autoCheckUpdates,
    developerMode,
    locale,
    theme,
    setRunOnBoot,
    setStartMinimized,
    setMinimizeToTray,
    setAutoCheckUpdates,
    setDeveloperMode,
    setLocale,
    setTheme
  } = useSettingsStore();

  useEffect(() => {
    setCachedUpdateTag(getCachedAvailableUpdateTag());
  }, []);

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    try {
      const { latestTag, hasUpdate } = await checkForAppUpdate({
        treatDevAsUpdate: true
      });

      if (hasUpdate) {
        cacheAvailableUpdate(latestTag);
        setCachedUpdateTag(latestTag);

        const wantsDownload = await confirm({
          title: t('updateAvailableTitle'),
          description: t('updateAvailableDesc', { version: latestTag }),
          confirmText: t('updateAvailableConfirm'),
          cancelText: t('updateAvailableCancel'),
          variant: 'primary'
        });

        if (wantsDownload) {
          const url = 'https://github.com/KidiXDev/RemapX/releases/latest';
          try {
            const { openUrl } = await import('@tauri-apps/plugin-opener');
            await openUrl(url);
          } catch (e) {
            window.open(url, '_blank');
          }
        }
      } else {
        clearCachedAvailableUpdate();
        setCachedUpdateTag(null);

        await confirm({
          title: t('noUpdateTitle'),
          description: t('noUpdateDesc'),
          confirmText: 'OK',
          cancelText: null,
          variant: 'secondary'
        });
      }
    } catch (error) {
      await confirm({
        title: t('updateCheckFailedTitle'),
        description: t('updateCheckFailedDesc'),
        confirmText: 'OK',
        cancelText: null,
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <ContentLayout title={t('title')} description={t('description')}>
      <div className="w-full flex flex-col gap-6">
        {/* Startup Options */}
        <Card title={t('startupCardTitle')}>
          <div className="space-y-4">
            {/* Run on Boot */}
            <div
              className={`flex items-center justify-between ${isPortable ? 'opacity-60' : ''}`}
            >
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('startWithWindows.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('startWithWindows.description')}
                </p>
              </div>
              <ToggleSwitch
                checked={runOnBoot}
                onChange={setRunOnBoot}
                disabled={isPortable}
              />
            </div>

            {/* Start Minimized */}
            <div
              className={`flex items-center justify-between ${!minimizeToTray ? 'opacity-60' : ''}`}
            >
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('startMinimized.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('startMinimized.description')}
                </p>
              </div>
              <ToggleSwitch
                checked={startMinimized}
                onChange={setStartMinimized}
                disabled={!minimizeToTray}
              />
            </div>

            {/* Minimize to Tray */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('minimizeToTray.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('minimizeToTray.description')}
                </p>
              </div>
              <ToggleSwitch
                checked={minimizeToTray}
                onChange={setMinimizeToTray}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('developerMode.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('developerMode.description')}
                </p>
              </div>
              <ToggleSwitch
                checked={developerMode}
                onChange={setDeveloperMode}
              />
            </div>
          </div>
        </Card>

        <Card title={t('languageCardTitle')}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-200">
              {t('languageLabel')}
            </label>
            <p className="text-xs text-zinc-500">{t('languageDescription')}</p>
            <Select<LocaleType>
              value={locale}
              onChange={setLocale}
              options={[
                { value: 'en', label: t('languageOptionEn') },
                { value: 'id', label: t('languageOptionId') }
              ]}
              className="max-w-xs"
            />
          </div>
        </Card>

        <Card title={t('themeCardTitle')}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                id: 'dark',
                title: t('themes.dark.title'),
                desc: t('themes.dark.desc'),
                accentColor: 'bg-cyan-500',
                previewBg: 'bg-[#09090b]',
                previewBorder: 'border-cyan-500/20'
              },
              {
                id: 'cyber',
                title: t('themes.cyber.title'),
                desc: t('themes.cyber.desc'),
                accentColor: 'bg-amber-500',
                previewBg: 'bg-[#0c0a05]',
                previewBorder: 'border-amber-500/20'
              },
              {
                id: 'neon',
                title: t('themes.neon.title'),
                desc: t('themes.neon.desc'),
                accentColor: 'bg-emerald-500',
                previewBg: 'bg-[#030905]',
                previewBorder: 'border-emerald-500/20'
              }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as ThemeType)}
                className={`group relative p-2.5 rounded-2xl border text-left flex flex-col gap-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                  theme === item.id
                    ? 'border-primary-border bg-primary-bg/25 shadow-lg shadow-primary-glow/5'
                    : 'border-border-main bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-950/20'
                }`}
              >
                {theme === item.id && (
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-primary-border text-primary-text border border-primary-border/50 animate-fade-in z-10">
                    <Check className="w-3 h-3" />
                  </div>
                )}

                <div
                  className={`w-full h-14 rounded-lg ${item.previewBg} border ${item.previewBorder} p-1.5 flex flex-col justify-between overflow-hidden relative transition-all duration-300`}
                >
                  <div
                    className={`absolute top-0 right-0 w-16 h-16 rounded-full ${item.accentColor} opacity-[0.03] blur-xl`}
                  />

                  <div className="flex items-center justify-between border-b border-zinc-900/60 pb-1">
                    <div className="flex gap-1 items-center">
                      <span
                        className={`w-1 h-1 rounded-full ${item.accentColor}`}
                      />
                      <span className="w-6 h-1 bg-zinc-800/80 rounded-sm" />
                    </div>
                    <div className="w-3 h-1 rounded-sm bg-zinc-900" />
                  </div>

                  <div className="flex gap-2 items-end mt-1">
                    <div className="flex-1 space-y-1">
                      <div className="w-10 h-1 bg-zinc-800/80 rounded-sm" />
                      <div className="w-14 h-0.5 bg-zinc-800/40 rounded-sm" />
                    </div>
                    <div
                      className={`w-5 h-3 rounded-md ${item.accentColor} opacity-80 flex items-center justify-center`}
                    >
                      <div className="w-1 h-1 rounded-full bg-zinc-950/40" />
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5 px-0.5">
                  <span
                    className={`block text-xs font-bold transition-colors ${
                      theme === item.id ? 'text-primary-text' : 'text-zinc-300'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="block text-[10px] text-zinc-500 leading-normal line-clamp-2">
                    {item.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* About App Card */}
        <Card title={t('aboutCardTitle')}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('autoCheckUpdates.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('autoCheckUpdates.description')}
                </p>
              </div>
              <ToggleSwitch
                checked={autoCheckUpdates}
                onChange={setAutoCheckUpdates}
              />
            </div>

            <div className="h-px bg-border-main/40" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200">RemapX</span>
                <span className="text-xs font-mono font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-border-main">
                  {__APP_VERSION__}
                </span>
                {cachedUpdateTag && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    {t('updateBadge', { version: cachedUpdateTag })}
                  </span>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={handleCheckUpdate}
                disabled={isChecking}
                className="px-3 py-1.5 h-8 text-[11px]"
              >
                {isChecking ? t('checkingUpdate') : t('checkUpdate')}
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              {t('appVersionDescription')}
            </p>
          </div>
        </Card>
      </div>
    </ContentLayout>
  );
}

export default Settings;
