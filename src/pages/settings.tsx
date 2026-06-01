import { useState } from 'react';

export function Settings() {
  const [runOnBoot, setRunOnBoot] = useState(true);
  const [startMinimized, setStartMinimized] = useState(true);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [pollingRate, setPollingRate] = useState('1000');
  const [deadzone, setDeadzone] = useState(8);
  const [theme, setTheme] = useState('dark');

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
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
        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-850 space-y-5">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-900 pb-2">
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
                  runOnBoot ? 'bg-cyan-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
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
                  startMinimized ? 'bg-cyan-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
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
                  minimizeToTray ? 'bg-cyan-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                    minimizeToTray ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Gamepad Parameters */}
        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-850 space-y-5">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-900 pb-2">
            Gamepad Driver Configuration
          </h3>

          <div className="space-y-5">
            {/* Polling Rate Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-zinc-200">
                  USB Polling Rate
                </label>
                <span className="text-[10px] font-bold text-cyan-400">
                  {pollingRate} Hz
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 bg-zinc-950/40 p-1 rounded-lg border border-zinc-900">
                {['125', '250', '500', '1000'].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPollingRate(rate)}
                    className={`py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      pollingRate === rate
                        ? 'bg-cyan-500 text-zinc-950 shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {rate}Hz
                  </button>
                ))}
              </div>
            </div>

            {/* Stick Deadzones Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-zinc-200">
                  Stick Inner Deadzone
                </label>
                <span className="text-[10px] font-bold text-cyan-400">
                  {deadzone}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={deadzone}
                onChange={(e) => setDeadzone(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <p className="text-[9px] text-zinc-650 leading-normal">
                Prevents stick drift on older controllers. Higher values require
                more stick movement to register action.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Engine Preferences */}
        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-850 space-y-5 md:col-span-2">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-900 pb-2">
            Theme & Interface Customization
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                id: 'dark',
                title: 'Carbon Dark',
                desc: 'Minimal dark interface optimized for OLED panels',
                border: 'border-cyan-500/30 bg-cyan-950/5'
              },
              {
                id: 'cyber',
                title: 'Cyberpunk Amber',
                desc: 'Edgy yellow-orange highlights for gaming environments',
                border: 'border-zinc-800'
              },
              {
                id: 'neon',
                title: 'Aurora Green',
                desc: 'Soothing neon mint highlights with glass panel styling',
                border: 'border-zinc-800'
              }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 hover:border-zinc-700 transition-all cursor-pointer ${
                  theme === item.id
                    ? item.border
                    : 'border-zinc-850 bg-zinc-900/10'
                }`}
              >
                <span
                  className={`text-xs font-bold ${theme === item.id ? 'text-cyan-400' : 'text-zinc-300'}`}
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
