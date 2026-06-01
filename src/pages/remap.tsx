import { useState } from 'react';

interface Mapping {
  id: string;
  source: string;
  target: string;
  type: 'Keyboard' | 'Mouse' | 'Macro' | 'System';
  status: 'Active' | 'Blocked';
}

export function Remap() {
  const [mappings, setMappings] = useState<Mapping[]>([
    {
      id: '1',
      source: 'L-Stick Up',
      target: 'W Key',
      type: 'Keyboard',
      status: 'Active'
    },
    {
      id: '2',
      source: 'L-Stick Down',
      target: 'S Key',
      type: 'Keyboard',
      status: 'Active'
    },
    {
      id: '3',
      source: 'L-Stick Left',
      target: 'A Key',
      type: 'Keyboard',
      status: 'Active'
    },
    {
      id: '4',
      source: 'L-Stick Right',
      target: 'D Key',
      type: 'Keyboard',
      status: 'Active'
    },
    {
      id: '5',
      source: 'Button South (A)',
      target: 'Spacebar (Jump)',
      type: 'Keyboard',
      status: 'Active'
    },
    {
      id: '6',
      source: 'Button West (X)',
      target: 'R Key (Reload)',
      type: 'Keyboard',
      status: 'Active'
    },
    {
      id: '7',
      source: 'Right Trigger (R2)',
      target: 'Left Click (Shoot)',
      type: 'Mouse',
      status: 'Active'
    },
    {
      id: '8',
      source: 'Left Trigger (L2)',
      target: 'Right Click (Aim)',
      type: 'Mouse',
      status: 'Active'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'bindings' | 'live'>('bindings');
  const [logs, setLogs] = useState<string[]>([
    '[02:15:30] Daemon connected to DualSense Edge...',
    '[02:15:31] Profile "FPS Competive Apex" loaded.',
    '[02:15:32] Input monitoring initialized at 1000Hz.'
  ]);

  const addSimulatedPress = (button: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] Pressed: ${button}`, ...prev.slice(0, 9)]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
            Remap Canvas
          </h2>
          <p className="text-xs text-zinc-500">
            Configure trigger deadzones, stick curves, and custom button
            assignments.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold rounded-lg transition-colors cursor-pointer">
            Save Config
          </button>
          <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors cursor-pointer">
            Revert Changes
          </button>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Hand Controller Graphic */}
        <div className="lg:col-span-5 rounded-2xl bg-zinc-900/30 border border-zinc-850 p-6 flex flex-col items-center justify-between min-h-[450px]">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest self-start">
            Interactive Mapping Blueprint
          </span>

          {/* Simple Visual Controller Drawing using SVG */}
          <div className="relative w-80 h-48 my-8 group">
            {/* Pulsing highlights for buttons */}
            <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-cyan-400/20 rounded-full animate-ping pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-purple-400/20 rounded-full animate-ping pointer-events-none" />

            <svg
              className="w-full h-full text-zinc-700 drop-shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-colors group-hover:text-zinc-650"
              viewBox="0 0 100 60"
              fill="currentColor"
            >
              {/* Outer Shell */}
              <path d="M 20 15 C 35 15, 38 22, 50 22 C 62 22, 65 15, 80 15 C 95 15, 96 35, 88 55 C 84 62, 70 55, 62 48 C 55 45, 45 45, 38 48 C 30 55, 16 62, 12 55 C 4 35, 5 15, 20 15 Z" />
              {/* Left Grip Inner */}
              <path
                d="M 15 20 C 22 20, 24 35, 16 48"
                stroke="currentColor"
                strokeWidth="0.5"
                fill="none"
                opacity="0.3"
              />
              {/* Right Grip Inner */}
              <path
                d="M 85 20 C 78 20, 76 35, 84 48"
                stroke="currentColor"
                strokeWidth="0.5"
                fill="none"
                opacity="0.3"
              />
              {/* D-Pad */}
              <path d="M 22 28 h 6 v 6 h -6 z" fill="#18181b" />
              <path d="M 24 26 h 2 v 10 h -2 z" fill="#18181b" />
              {/* Left Stick */}
              <circle
                cx="34"
                cy="38"
                r="6"
                fill="#09090b"
                stroke="#22d3ee"
                strokeWidth="0.75"
              />
              <circle cx="34" cy="38" r="3" fill="#27272a" />
              {/* Right Stick */}
              <circle
                cx="66"
                cy="38"
                r="6"
                fill="#09090b"
                stroke="#22d3ee"
                strokeWidth="0.75"
              />
              <circle cx="66" cy="38" r="3" fill="#27272a" />
              {/* Action Buttons */}
              <circle cx="78" cy="28" r="2" fill="#e4e4e7" /> {/* Y */}
              <circle cx="74" cy="32" r="2" fill="#e4e4e7" /> {/* X */}
              <circle cx="82" cy="32" r="2" fill="#e4e4e7" /> {/* B */}
              <circle cx="78" cy="36" r="2" fill="#22d3ee" /> {/* A */}
            </svg>

            {/* Simulated Interactive buttons on overlay */}
            <button
              onClick={() => addSimulatedPress('L-Stick')}
              className="absolute top-[55%] left-[30%] w-7 h-7 rounded-full bg-cyan-400/10 hover:bg-cyan-400/30 border border-cyan-400/20 cursor-pointer transition-all"
              title="Click to simulate Left Stick input"
            />
            <button
              onClick={() => addSimulatedPress('R-Stick')}
              className="absolute top-[55%] right-[30%] w-7 h-7 rounded-full bg-cyan-400/10 hover:bg-cyan-400/30 border border-cyan-400/20 cursor-pointer transition-all"
              title="Click to simulate Right Stick input"
            />
            <button
              onClick={() => addSimulatedPress('A Button')}
              className="absolute top-[52%] right-[19%] w-5 h-5 rounded-full bg-cyan-400/10 hover:bg-cyan-400/30 border border-cyan-400/20 cursor-pointer transition-all"
              title="Click to simulate A button input"
            />
          </div>

          <div className="text-center text-xs text-zinc-500 px-4">
            Click on the highlighted stick circles or buttons on the blueprint
            to test driver injection and write diagnostic logs.
          </div>
        </div>

        {/* Right Hand Configuration / Mapping List */}
        <div className="lg:col-span-7 rounded-2xl bg-zinc-900/30 border border-zinc-850 overflow-hidden flex flex-col h-[450px]">
          {/* Tab Selector */}
          <div className="flex border-b border-zinc-800 bg-zinc-900/20 shrink-0">
            <button
              onClick={() => setActiveTab('bindings')}
              className={`flex-1 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'bindings'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Active Key Bindings ({mappings.length})
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Diagnostics & Input Monitor
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'bindings' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] font-semibold text-zinc-650 uppercase tracking-widest px-3 mb-2">
                  <div className="col-span-5">Gamepad Trigger</div>
                  <div className="col-span-4">Mapped Output</div>
                  <div className="col-span-3 text-right">Type</div>
                </div>

                {mappings.map((map) => (
                  <div
                    key={map.id}
                    className="grid grid-cols-12 items-center bg-zinc-900/10 border border-zinc-850/60 rounded-xl px-4 py-2.5 hover:border-zinc-800 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="col-span-5 text-xs font-bold text-zinc-200">
                      {map.source}
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      <svg
                        className="w-3 h-3 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 5l7 7-7 7M5 5l7 7-7 7"
                        />
                      </svg>
                      <span className="text-xs font-semibold text-zinc-300">
                        {map.target}
                      </span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                        {map.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div className="font-mono text-[11px] space-y-1 bg-black/30 p-4 rounded-xl border border-zinc-900 flex-1 overflow-y-auto min-h-[250px]">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Pressed')
                          ? 'text-cyan-400 font-bold'
                          : 'text-zinc-400'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 shrink-0">
                  <button
                    onClick={() => setLogs([])}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer border border-zinc-800"
                  >
                    Clear Diagnostics
                  </button>
                  <button
                    onClick={() => addSimulatedPress('D-Pad Right')}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-400 transition-colors cursor-pointer"
                  >
                    Test Input Injection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default Remap;
