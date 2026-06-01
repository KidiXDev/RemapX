import { Mapping } from '@/hooks/use-settings-store';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

interface GamepadStatePayload {
  button_id: number;
  pressed: boolean;
}

interface GamepadProps {
  onButtonPress: (button: string) => void;
  onControlSelect?: (buttonId: number, label: string) => void;
  mappings?: Mapping[];
}

export function Gamepad({
  onButtonPress,
  onControlSelect,
  mappings = []
}: GamepadProps) {
  const [pressedButtons, setPressedButtons] = useState<Record<number, boolean>>(
    {}
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<GamepadStatePayload>('gamepad-button-state', (event) => {
      const { button_id, pressed } = event.payload;
      setPressedButtons((prev) => ({ ...prev, [button_id]: pressed }));
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.error('Failed to subscribe gamepad-button-state', err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    let raf = 0;

    const pollBrowserGamepad = () => {
      const pads =
        typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
      const next: Record<number, boolean> = {};

      if (pads) {
        for (const pad of pads) {
          if (!pad) continue;
          if (pad.buttons[0]?.pressed) next[0] = true;
          if (pad.buttons[1]?.pressed) next[1] = true;
          if (pad.buttons[2]?.pressed) next[2] = true;
          if (pad.buttons[3]?.pressed) next[3] = true;
          if (pad.buttons[4]?.pressed) next[4] = true;
          if (pad.buttons[5]?.pressed) next[5] = true;
          if (pad.buttons[6]?.pressed) next[6] = true;
          if (pad.buttons[7]?.pressed) next[7] = true;
          if (pad.buttons[8]?.pressed) next[8] = true;
          if (pad.buttons[9]?.pressed) next[9] = true;
          if (pad.buttons[10]?.pressed) next[11] = true;
          if (pad.buttons[11]?.pressed) next[12] = true;
          if (pad.buttons[12]?.pressed) next[13] = true;
          if (pad.buttons[13]?.pressed) next[14] = true;
          if (pad.buttons[14]?.pressed) next[15] = true;
          if (pad.buttons[15]?.pressed) next[16] = true;
          if (pad.buttons[16]?.pressed) next[10] = true;
        }
      }

      setPressedButtons(next);
      raf = requestAnimationFrame(pollBrowserGamepad);
    };

    raf = requestAnimationFrame(pollBrowserGamepad);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Helper to format hover text showing what the button maps to
  const getMappingText = (buttonId: number, defaultName: string) => {
    const mapping = mappings.find((m) => m.button_id === buttonId);
    if (!mapping) return `${defaultName} (Unmapped)`;
    return `${defaultName} ➔ ${mapping.key_str} (${mapping.mapping_type})`;
  };

  // Determine button presses based on standard Gilrs/XInput mapping IDs
  const pressedA = !!pressedButtons[0];
  const pressedB = !!pressedButtons[1];
  const pressedX = !!pressedButtons[2];
  const pressedY = !!pressedButtons[3];
  const pressedLB = !!pressedButtons[4];
  const pressedRB = !!pressedButtons[5];
  const pressedLT = !!pressedButtons[6];
  const pressedRT = !!pressedButtons[7];
  const pressedSelect = !!pressedButtons[8];
  const pressedStart = !!pressedButtons[9];
  const pressedMode = !!pressedButtons[10];
  const pressedLS = !!pressedButtons[11];
  const pressedRS = !!pressedButtons[12];
  const pressedDUp = !!pressedButtons[13];
  const pressedDDown = !!pressedButtons[14];
  const pressedDLeft = !!pressedButtons[15];
  const pressedDRight = !!pressedButtons[16];

  const handleControlClick = (buttonId: number, label: string) => {
    onButtonPress(label);
    onControlSelect?.(buttonId, label);
  };

  return (
    <div className="relative w-full max-w-[480px] aspect-5/3 my-4 group select-none">
      <svg
        className="w-full h-full text-zinc-700 transition-colors duration-300"
        viewBox="0 0 100 60"
        fill="currentColor"
      >
        <defs>
          {/* Neon Glow Filter */}
          <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Stick Gradient */}
          <radialGradient id="stickGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="75%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#09090b" />
          </radialGradient>

          {/* Controller Body Gradient */}
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#202023" />
            <stop offset="100%" stopColor="#121214" />
          </linearGradient>
        </defs>

        {/* Floating Triggers & Bumpers (Vertical Stack on Top Left/Right) */}

        {/* Left Side: LT (top capsule) and LB (bottom pill) */}
        {/* Left Trigger (LT) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(6, 'Left Trigger')}
        >
          <rect
            x="24"
            y="3.5"
            width="4"
            height="5"
            rx="1.5"
            fill={pressedLT ? 'var(--primary)' : '#18181b'}
            filter={pressedLT ? 'url(#glow)' : undefined}
            stroke={pressedLT ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(6, 'Left Trigger (LT)')}</title>
        </g>

        {/* Left Bumper (LB) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(4, 'Left Bumper')}
        >
          <rect
            x="22"
            y="9.8"
            width="8"
            height="1.8"
            rx="0.7"
            fill={pressedLB ? 'var(--primary)' : '#27272a'}
            filter={pressedLB ? 'url(#glow)' : undefined}
            stroke={pressedLB ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(4, 'Left Bumper (LB)')}</title>
        </g>

        {/* Right Side: RT (top capsule) and RB (bottom pill) */}
        {/* Right Trigger (RT) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(7, 'Right Trigger')}
        >
          <rect
            x="72"
            y="3.5"
            width="4"
            height="5"
            rx="1.5"
            fill={pressedRT ? 'var(--primary)' : '#18181b'}
            filter={pressedRT ? 'url(#glow)' : undefined}
            stroke={pressedRT ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(7, 'Right Trigger (RT)')}</title>
        </g>

        {/* Right Bumper (RB) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(5, 'Right Bumper')}
        >
          <rect
            x="70"
            y="9.8"
            width="8"
            height="1.8"
            rx="0.7"
            fill={pressedRB ? 'var(--primary)' : '#27272a'}
            filter={pressedRB ? 'url(#glow)' : undefined}
            stroke={pressedRB ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(5, 'Right Bumper (RB)')}</title>
        </g>

        {/* Gamepad Body */}
        <path
          d="M 20 15 C 35 15, 38 22, 50 22 C 62 22, 65 15, 80 15 C 95 15, 96 35, 88 55 C 84 62, 70 55, 62 48 C 55 45, 45 45, 38 48 C 30 55, 16 62, 12 55 C 4 35, 5 15, 20 15 Z"
          fill="url(#bodyGrad)"
          stroke="var(--border-main)"
          strokeWidth="0.75"
        />

        {/* Inner Grip Accents */}
        <path
          d="M 12 55 C 16 62, 30 55, 38 48"
          stroke="var(--border-main)"
          strokeWidth="0.5"
          fill="none"
          opacity="0.35"
        />
        <path
          d="M 88 55 C 84 62, 70 55, 62 48"
          stroke="var(--border-main)"
          strokeWidth="0.5"
          fill="none"
          opacity="0.35"
        />

        {/* Mode / Guide Button (Center) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(10, 'Mode Button')}
        >
          <circle
            cx="50"
            cy="28"
            r="3.5"
            fill={pressedMode ? 'var(--primary)' : '#18181b'}
            filter={pressedMode ? 'url(#glow)' : undefined}
            stroke={pressedMode ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.75"
            className="transition-all duration-150 hover:brightness-125"
          />
          <circle
            cx="50"
            cy="28"
            r="1.8"
            fill="none"
            stroke={pressedMode ? '#fff' : 'var(--border-main)'}
            strokeWidth="0.5"
            opacity="0.8"
          />
          <title>{getMappingText(10, 'Home / Mode Button')}</title>
        </g>

        {/* Select / Back Button */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(8, 'Select Button')}
        >
          <rect
            x="39.5"
            y="27.25"
            width="3"
            height="1.5"
            rx="0.5"
            transform="rotate(-15 41 28)"
            fill={pressedSelect ? 'var(--primary)' : '#27272a'}
            filter={pressedSelect ? 'url(#glow)' : undefined}
            stroke={
              pressedSelect ? 'var(--primary-hover)' : 'var(--border-main)'
            }
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(8, 'Select / Back Button')}</title>
        </g>

        {/* Start / Options Button */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(9, 'Start Button')}
        >
          <rect
            x="57.5"
            y="27.25"
            width="3"
            height="1.5"
            rx="0.5"
            transform="rotate(15 59 28)"
            fill={pressedStart ? 'var(--primary)' : '#27272a'}
            filter={pressedStart ? 'url(#glow)' : undefined}
            stroke={
              pressedStart ? 'var(--primary-hover)' : 'var(--border-main)'
            }
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(9, 'Start / Options Button')}</title>
        </g>

        {/* D-Pad Background base */}
        <path
          d="M 23.5 26 h 3 v 10 h -3 z M 20 29.5 h 10 v 3 h -10 z"
          fill="#141416"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.5"
        />

        {/* Interactive D-Pad Directions */}
        {/* D-Pad Up */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(13, 'D-Pad Up')}
        >
          <path
            d="M 23.5 29.5 L 26.5 29.5 L 26.5 26.5 C 26.5 25.5, 23.5 25.5, 23.5 26.5 Z"
            fill={pressedDUp ? 'var(--primary)' : '#27272a'}
            filter={pressedDUp ? 'url(#glow)' : undefined}
            stroke={pressedDUp ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(13, 'D-Pad Up')}</title>
        </g>

        {/* D-Pad Down */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(14, 'D-Pad Down')}
        >
          <path
            d="M 23.5 32.5 L 26.5 32.5 L 26.5 35.5 C 26.5 36.5, 23.5 36.5, 23.5 35.5 Z"
            fill={pressedDDown ? 'var(--primary)' : '#27272a'}
            filter={pressedDDown ? 'url(#glow)' : undefined}
            stroke={
              pressedDDown ? 'var(--primary-hover)' : 'var(--border-main)'
            }
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(14, 'D-Pad Down')}</title>
        </g>

        {/* D-Pad Left */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(15, 'D-Pad Left')}
        >
          <path
            d="M 23.5 29.5 L 23.5 32.5 L 20.5 32.5 C 19.5 32.5, 19.5 29.5, 20.5 29.5 Z"
            fill={pressedDLeft ? 'var(--primary)' : '#27272a'}
            filter={pressedDLeft ? 'url(#glow)' : undefined}
            stroke={
              pressedDLeft ? 'var(--primary-hover)' : 'var(--border-main)'
            }
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(15, 'D-Pad Left')}</title>
        </g>

        {/* D-Pad Right */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(16, 'D-Pad Right')}
        >
          <path
            d="M 26.5 29.5 L 26.5 32.5 L 29.5 32.5 C 30.5 32.5, 30.5 29.5, 29.5 29.5 Z"
            fill={pressedDRight ? 'var(--primary)' : '#27272a'}
            filter={pressedDRight ? 'url(#glow)' : undefined}
            stroke={
              pressedDRight ? 'var(--primary-hover)' : 'var(--border-main)'
            }
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <title>{getMappingText(16, 'D-Pad Right')}</title>
        </g>

        {/* Left Thumbstick (LS) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(11, 'Left Stick')}
        >
          {/* Base / Ring */}
          <circle
            cx="36"
            cy="44"
            r="6.5"
            fill="url(#stickGrad)"
            stroke="var(--border-main)"
            strokeWidth="0.5"
          />
          {/* Stick Cap */}
          <circle
            cx="36"
            cy="44"
            r="4.5"
            fill={pressedLS ? 'var(--primary)' : '#2e2e33'}
            filter={pressedLS ? 'url(#glow)' : undefined}
            stroke={pressedLS ? 'var(--primary-hover)' : '#44444a'}
            strokeWidth="0.55"
            style={{ transformOrigin: '36px 44px' }}
            className={`transition-all duration-150 hover:brightness-125 ${pressedLS ? 'scale-90' : ''}`}
          />
          {/* Inner Accent */}
          <circle
            cx="36"
            cy="44"
            r="2.2"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="0.5"
            pointerEvents="none"
          />
          <title>{getMappingText(11, 'Left Stick Click (LS / L3)')}</title>
        </g>

        {/* Right Thumbstick (RS) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(12, 'Right Stick')}
        >
          {/* Base / Ring */}
          <circle
            cx="64"
            cy="44"
            r="6.5"
            fill="url(#stickGrad)"
            stroke="var(--border-main)"
            strokeWidth="0.5"
          />
          {/* Stick Cap */}
          <circle
            cx="64"
            cy="44"
            r="4.5"
            fill={pressedRS ? 'var(--primary)' : '#2e2e33'}
            filter={pressedRS ? 'url(#glow)' : undefined}
            stroke={pressedRS ? 'var(--primary-hover)' : '#44444a'}
            strokeWidth="0.55"
            style={{ transformOrigin: '64px 44px' }}
            className={`transition-all duration-150 hover:brightness-125 ${pressedRS ? 'scale-90' : ''}`}
          />
          {/* Inner Accent */}
          <circle
            cx="64"
            cy="44"
            r="2.2"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="0.5"
            pointerEvents="none"
          />
          <title>{getMappingText(12, 'Right Stick Click (RS / R3)')}</title>
        </g>

        {/* Face Buttons Cluster (Y, X, B, A) */}
        {/* Y Button (North) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(3, 'Y Button')}
        >
          <circle
            cx="75"
            cy="26"
            r="2.2"
            fill={pressedY ? 'var(--primary)' : '#27272a'}
            filter={pressedY ? 'url(#glow)' : undefined}
            stroke={pressedY ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <text
            x="75"
            y="26.8"
            textAnchor="middle"
            fontSize="2.2"
            fontWeight="bold"
            fill={pressedY ? '#fff' : 'rgba(255, 255, 255, 0.45)'}
            pointerEvents="none"
          >
            Y
          </text>
          <title>{getMappingText(3, 'Y Button')}</title>
        </g>

        {/* X Button (West) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(2, 'X Button')}
        >
          <circle
            cx="70"
            cy="31"
            r="2.2"
            fill={pressedX ? 'var(--primary)' : '#27272a'}
            filter={pressedX ? 'url(#glow)' : undefined}
            stroke={pressedX ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <text
            x="70"
            y="31.8"
            textAnchor="middle"
            fontSize="2.2"
            fontWeight="bold"
            fill={pressedX ? '#fff' : 'rgba(255, 255, 255, 0.45)'}
            pointerEvents="none"
          >
            X
          </text>
          <title>{getMappingText(2, 'X Button')}</title>
        </g>

        {/* B Button (East) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(1, 'B Button')}
        >
          <circle
            cx="80"
            cy="31"
            r="2.2"
            fill={pressedB ? 'var(--primary)' : '#27272a'}
            filter={pressedB ? 'url(#glow)' : undefined}
            stroke={pressedB ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <text
            x="80"
            y="31.8"
            textAnchor="middle"
            fontSize="2.2"
            fontWeight="bold"
            fill={pressedB ? '#fff' : 'rgba(255, 255, 255, 0.45)'}
            pointerEvents="none"
          >
            B
          </text>
          <title>{getMappingText(1, 'B Button')}</title>
        </g>

        {/* A Button (South) */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(0, 'A Button')}
        >
          <circle
            cx="75"
            cy="36"
            r="2.2"
            fill={pressedA ? 'var(--primary)' : '#27272a'}
            filter={pressedA ? 'url(#glow)' : undefined}
            stroke={pressedA ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.5"
            className="transition-all duration-150 hover:brightness-125"
          />
          <text
            x="75"
            y="36.8"
            textAnchor="middle"
            fontSize="2.2"
            fontWeight="bold"
            fill={pressedA ? '#fff' : 'rgba(255, 255, 255, 0.45)'}
            pointerEvents="none"
          >
            A
          </text>
          <title>{getMappingText(0, 'A Button')}</title>
        </g>
      </svg>
    </div>
  );
}

export default Gamepad;
