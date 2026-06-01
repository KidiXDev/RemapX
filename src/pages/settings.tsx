import { useSettingsStore, ThemeType } from '@/hooks/use-settings-store';
import { Card } from '@/components/common/card';
import { ToggleSwitch } from '@/components/common/button';
import { Slider } from '@/components/common/slider';

export function Settings() {
  const {
    runOnBoot,
    startMinimized,
    minimizeToTray,
    debounce,
    theme,
    setRunOnBoot,
    setStartMinimized,
    setMinimizeToTray,
    setDebounce,
    setTheme
  } = useSettingsStore();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
          System Settings
        </h2>
        <p className="text-xs text-zinc-500">
          Configure application driver defaults, startup behavior, and visual
          preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Startup Options */}
        <Card title="Startup & Window Behavior">
          <div className="space-y-4">
            {/* Run on Boot */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  Start with Windows
                </label>
                <p className="text-[10px] text-zinc-500">
                  Launch daemon in system tray when booting.
                </p>
              </div>
              <ToggleSwitch checked={runOnBoot} onChange={setRunOnBoot} />
            </div>

            {/* Start Minimized */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  Start Minimized
                </label>
                <p className="text-[10px] text-zinc-500">
                  Do not open the GUI window on system startup.
                </p>
              </div>
              <ToggleSwitch checked={startMinimized} onChange={setStartMinimized} />
            </div>

            {/* Minimize to Tray */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-zinc-200">
                  Minimize to System Tray
                </label>
                <p className="text-[10px] text-zinc-500">
                  Closing the window will hide it to the tray.
                </p>
              </div>
              <ToggleSwitch checked={minimizeToTray} onChange={setMinimizeToTray} />
            </div>
          </div>
        </Card>

        {/* Gamepad Parameters */}
        <Card title="Gamepad Driver Configuration">
          <div className="space-y-5">
            {/* Button Debounce Slider */}
            <Slider
              label="Button Debounce Time"
              value={debounce}
              onChange={setDebounce}
              min={0}
              max={50}
              suffix="ms"
              description="Filters physical switch chatter on button presses. Prevents duplicate or noisy inputs by specifying a minimum latency threshold between activations."
            />
          </div>
        </Card>

        {/* Visual Engine Preferences */}
        <Card title="Theme & Interface Customization" className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                id: 'dark',
                title: 'Carbon Dark',
                desc: 'Minimal dark interface optimized for OLED panels'
              },
              {
                id: 'cyber',
                title: 'Cyberpunk Amber',
                desc: 'Edgy yellow-orange highlights for gaming environments'
              },
              {
                id: 'neon',
                title: 'Aurora Green',
                desc: 'Soothing neon mint highlights with glass panel styling'
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
                <span className="text-[10px] text-zinc-500 leading-normal">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
