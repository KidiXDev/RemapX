import { Button } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Tabs } from '@/components/common/tabs';
import { Gamepad } from '@/components/template/gamepad';
import { ChevronsRight, Play, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Mapping {
  id: string;
  source: string;
  target: string;
  type: 'Keyboard' | 'Mouse' | 'Macro' | 'System';
  status: 'Active' | 'Blocked';
}

type TabType = 'bindings' | 'live';

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

  const [activeTab, setActiveTab] = useState<TabType>('bindings');
  const [logs, setLogs] = useState<string[]>([
    '[02:15:30] Daemon connected to DualSense Edge...',
    '[02:15:31] Profile "FPS Competive Apex" loaded.',
    '[02:15:32] Input monitoring initialized at 1000Hz.'
  ]);

  const addSimulatedPress = (button: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] Pressed: ${button}`, ...prev.slice(0, 9)]);
  };

  const tabOptions = [
    {
      id: 'bindings' as TabType,
      label: `Active Key Bindings (${mappings.length})`
    },
    { id: 'live' as TabType, label: 'Diagnostics & Input Monitor' }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header Info */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
            Remap Canvas
          </h2>
          <p className="text-xs text-zinc-500">
            Configure trigger deadzones, stick curves, and custom button
            assignments.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="primary">
            <Save className="w-3.5 h-3.5" />
            <span>Save Config</span>
          </Button>
          <Button variant="secondary">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Revert Changes</span>
          </Button>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Hand Controller Graphic */}
        <Card className="lg:col-span-5 items-center justify-between min-h-[450px] flex flex-col space-y-0">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest self-start">
            Interactive Mapping Blueprint
          </span>
          <Gamepad onButtonPress={addSimulatedPress} />

          <div className="text-center text-xs text-zinc-500 px-4 leading-relaxed">
            Click on the highlighted stick circles or buttons on the blueprint
            to test driver injection and write diagnostic logs.
          </div>
        </Card>

        {/* Right Hand Configuration / Mapping List */}
        <Card className="lg:col-span-7 overflow-hidden p-0 h-[450px] flex flex-col space-y-0">
          {/* Tab Selector */}
          <Tabs
            options={tabOptions}
            activeId={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'bindings' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-2">
                  <div className="col-span-5">Gamepad Trigger</div>
                  <div className="col-span-4">Mapped Output</div>
                  <div className="col-span-3 text-right">Type</div>
                </div>

                {mappings.map((map) => (
                  <div
                    key={map.id}
                    className="grid grid-cols-12 items-center bg-zinc-950/20 border border-border-main/50 rounded-xl px-4 py-2.5 hover:border-border-hover hover:bg-zinc-900/10 transition-colors"
                  >
                    <div className="col-span-5 text-xs font-bold text-zinc-200">
                      {map.source}
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      <ChevronsRight className="w-3.5 h-3.5 text-primary-text animate-pulse" />
                      <span className="text-xs font-semibold text-zinc-300">
                        {map.target}
                      </span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900/60 text-zinc-400 border border-border-main/60">
                        {map.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div className="font-mono text-[11px] space-y-1 bg-zinc-950/50 p-4 rounded-xl border border-border-main flex-1 overflow-y-auto min-h-[250px]">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Pressed')
                          ? 'text-primary-text font-bold'
                          : 'text-zinc-450'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2.5 mt-4 shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() => setLogs([])}
                    className="px-3.5 py-1.5 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Clear Diagnostics</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => addSimulatedPress('D-Pad Right')}
                    className="px-3.5 py-1.5 rounded-lg bg-primary-bg hover:bg-primary/25 border-primary-border/40 text-primary-text hover:text-primary-text"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Test Input Injection</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Remap;
