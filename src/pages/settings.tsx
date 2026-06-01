import { ContentLayout } from '@/components/layout/content-layout';
import { ToggleSwitch } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Select } from '@/components/common/select';
import { LocaleType } from '@/hooks/use-settings-store';
import { ThemeType, useSettingsStore } from '@/hooks/use-settings-store';
import { useTranslation } from 'react-i18next';

export function Settings() {
  const { t } = useTranslation('settings');
  const {
    developerMode,
    locale,
    theme,
    setDeveloperMode,
    setLocale,
    setTheme
  } = useSettingsStore();

  return (
    <ContentLayout
      title={t('title')}
      description={t('description')}
    >
      <div className="w-full flex flex-col gap-6">
        {/* Startup Options */}
        <Card title={t('startupCardTitle')}>
          <div className="space-y-4">
            {/* Run on Boot */}
            <div className="flex items-center justify-between opacity-60">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('startWithWindows.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('startWithWindows.description')}
                </p>
              </div>
              <ToggleSwitch checked={false} onChange={() => {}} disabled />
            </div>

            {/* Start Minimized */}
            <div className="flex items-center justify-between opacity-60">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('startMinimized.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('startMinimized.description')}
                </p>
              </div>
              <ToggleSwitch
                checked={false}
                onChange={() => {}}
                disabled
              />
            </div>

            {/* Minimize to Tray */}
            <div className="flex items-center justify-between opacity-60">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  {t('minimizeToTray.label')}
                </label>
                <p className="text-xs text-zinc-500">
                  {t('minimizeToTray.description')}
                </p>
              </div>
              <ToggleSwitch
                checked={false}
                onChange={() => {}}
                disabled
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

        {/* Visual Engine Preferences */}
        <Card title={t('themeCardTitle')}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                id: 'dark',
                title: t('themes.dark.title'),
                desc: t('themes.dark.desc')
              },
              {
                id: 'cyber',
                title: t('themes.cyber.title'),
                desc: t('themes.cyber.desc')
              },
              {
                id: 'neon',
                title: t('themes.neon.title'),
                desc: t('themes.neon.desc')
              }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as ThemeType)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 hover:border-border-hover transition-all cursor-pointer ${
                  theme === item.id
                    ? 'border-primary-border bg-primary-bg'
                    : 'border-border-main bg-zinc-900/10'
                }`}
              >
                <span
                  className={`text-xs font-bold ${theme === item.id ? 'text-primary-text' : 'text-zinc-300'}`}
                >
                  {item.title}
                </span>
                <span className="text-xs text-zinc-500 leading-normal">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* About App Card */}
        <Card title={t('aboutCardTitle')}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200">RemapX</span>
              <span className="text-xs font-mono font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-border-main">
                {__APP_VERSION__}
              </span>
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
