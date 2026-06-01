import { useState } from 'react';
import { useNavigate } from 'react-router';

interface Profile {
  id: string;
  name: string;
  game: string;
  device: string;
  mappingsCount: number;
  isActive: boolean;
  color: string;
}

export function Home() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([
    {
      id: '1',
      name: 'FPS Competive Apex',
      game: 'Apex Legends',
      device: 'DualSense Edge',
      mappingsCount: 18,
      isActive: true,
      color:
        'from-orange-500/20 to-rose-500/20 border-orange-500/30 text-orange-400'
    },
    {
      id: '2',
      name: 'Cyberpunk Immersive',
      game: 'Cyberpunk 2077',
      device: 'DualSense Edge',
      mappingsCount: 12,
      isActive: false,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400'
    },
    {
      id: '3',
      name: 'Elden Ring DodgeRoll',
      game: 'Elden Ring',
      device: 'Xbox Series Controller',
      mappingsCount: 8,
      isActive: false,
      color:
        'from-amber-500/20 to-yellow-600/20 border-amber-500/30 text-amber-400'
    }
  ]);

  const toggleActive = (id: string) => {
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        isActive: p.id === id ? !p.isActive : false // Only one active profile at a time
      }))
    );
  };

  const handleEdit = (id: string) => {
    navigate('/remap');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-r from-cyan-900/40 via-zinc-900/60 to-zinc-950/80 p-8 border border-zinc-800/80 shadow-2xl shadow-cyan-950/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-2">
            Welcome to RemapX
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Configure, remap and fine-tune your controller inputs. Bind keys,
            macros, and axis actions to any gamepad device seamlessly. Ensure
            your daemon is running in the system tray for lowest latency
            processing.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/remap')}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Start Remapping
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all duration-300 border border-zinc-700/60 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              View Settings
            </button>
          </div>
        </div>
      </section>

      {/* Quick Dashboard Info */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Connected Devices',
            val: '1 Gamepad',
            desc: 'DualSense Edge (USB)',
            glow: 'shadow-emerald-500/5 border-emerald-500/10'
          },
          {
            label: 'Total Profiles',
            val: '3 Profiles',
            desc: 'Configured locally',
            glow: 'shadow-cyan-500/5 border-cyan-500/10'
          },
          {
            label: 'Driver Latency',
            val: '< 1.2 ms',
            desc: 'Optimal performance',
            glow: 'shadow-violet-500/5 border-violet-500/10'
          },
          {
            label: 'Virtual Mappings',
            val: '38 Active Binds',
            desc: 'Direct inject enabled',
            glow: 'shadow-rose-500/5 border-rose-500/10'
          }
        ].map((item, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl bg-zinc-900/30 border border-zinc-850 backdrop-blur-sm shadow-xl ${item.glow} flex flex-col justify-between h-28`}
          >
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
              {item.label}
            </span>
            <div>
              <span className="text-xl font-bold text-zinc-100">
                {item.val}
              </span>
              <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Profiles Workspace */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-200">
              Gamepad Profiles
            </h3>
            <p className="text-xs text-zinc-500">
              Toggle profile settings or load a configuration canvas
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 transition-all cursor-pointer">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Create Profile</span>
          </button>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`rounded-2xl bg-zinc-900/20 border border-zinc-800/80 p-6 flex flex-col justify-between hover:border-zinc-700 hover:shadow-2xl transition-all duration-300 relative group overflow-hidden ${
                profile.isActive
                  ? 'ring-1 ring-cyan-500/30 border-cyan-500/30 bg-cyan-950/5'
                  : ''
              }`}
            >
              {profile.isActive && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full blur-xl pointer-events-none" />
              )}

              <div className="space-y-4">
                {/* Profile Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider bg-zinc-900 ${profile.color}`}
                    >
                      {profile.game}
                    </span>
                    <h4 className="text-base font-bold text-zinc-200 mt-2.5 leading-snug group-hover:text-cyan-400 transition-colors">
                      {profile.name}
                    </h4>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 ${profile.isActive ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-zinc-600'}`}
                  />
                </div>

                {/* Profile Details */}
                <div className="pt-2 grid grid-cols-2 gap-3 text-[11px] text-zinc-500 border-t border-zinc-900">
                  <div>
                    <span className="block text-zinc-600 uppercase tracking-widest font-medium">
                      Device
                    </span>
                    <span className="font-semibold text-zinc-400">
                      {profile.device}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-600 uppercase tracking-widest font-medium">
                      Mappings
                    </span>
                    <span className="font-semibold text-zinc-400">
                      {profile.mappingsCount} Keys
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 mt-6 border-t border-zinc-900 pt-4">
                <button
                  onClick={() => toggleActive(profile.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    profile.isActive
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-rose-400 hover:text-rose-300'
                      : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400'
                  }`}
                >
                  {profile.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleEdit(profile.id)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-600 text-zinc-300 transition-all cursor-pointer flex items-center justify-center"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
export default Home;
