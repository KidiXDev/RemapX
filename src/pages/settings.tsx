import { useSettingsStore, ThemeType } from '../hooks/use-settings-store';

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
        <div className="p-6 rounded-2xl bg-bg-card border border-border-main space-y-5">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider border-b border-border-main/40 pb-2">
            Startup & Window Behavior
          </h3>

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
              <button
                onClick={() => setRunOnBoot(!runOnBoot)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                  runOnBoot ? 'bg-primary' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-bg-main transition-transform ${
                    runOnBoot ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
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
              <button
                onClick={() => setStartMinimized(!startMinimized)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                  startMinimized ? 'bg-primary' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-bg-main transition-transform ${
                    startMinimized ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
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
              <button
                onClick={() => setMinimizeToTray(!minimizeToTray)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                  minimizeToTray ? 'bg-primary' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-bg-main transition-transform ${
                    minimizeToTray ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Gamepad Parameters */}
        <div className="p-6 rounded-2xl bg-bg-card border border-border-main space-y-5">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider border-b border-border-main/40 pb-2">
            Gamepad Driver Configuration
          </h3>

          <div className="space-y-5">
            {/* Button Debounce Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-zinc-200">
                  Button Debounce Time
                </label>
                <span className="text-[10px] font-bold text-primary-text">
                  {debounce} ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={debounce}
                onChange={(e) => setDebounce(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[9px] text-zinc-400 leading-normal">
                Filters physical switch chatter on button presses. Prevents duplicate
                or noisy inputs by specifying a minimum latency threshold between activations.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Engine Preferences */}
        <div className="p-6 rounded-2xl bg-bg-card border border-border-main space-y-5 md:col-span-2">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider border-b border-border-main/40 pb-2">
            Theme & Interface Customization
          </h3>

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
        </div>
      </div>
    </div>
  );
}

export default Settings;
