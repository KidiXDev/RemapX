import { Mapping } from '@/hooks/use-settings-store';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

interface GamepadStatePayload {
  button_id: number;
  pressed: boolean;
}

interface GamepadAxisPayload {
  axis_id: number;
  value: number;
}

interface GamepadProps {
  onButtonPress: (button: string) => void;
  onControlSelect?: (buttonId: number, label: string) => void;
  mappings?: Mapping[];
  engineRunning?: boolean;
}

export function Gamepad({
  onButtonPress,
  onControlSelect,
  mappings = [],
  engineRunning = false
}: GamepadProps) {
  const [pressedButtons, setPressedButtons] = useState<Record<number, boolean>>(
    {}
  );
  const [leftStick, setLeftStick] = useState({ x: 0, y: 0 });
  const [rightStick, setRightStick] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let unlistenButton: (() => void) | undefined;
    let unlistenAxis: (() => void) | undefined;

    listen<GamepadStatePayload>('gamepad-button-state', (event) => {
      const { button_id, pressed } = event.payload;
      setPressedButtons((prev) => ({ ...prev, [button_id]: pressed }));
    })
      .then((fn) => {
        unlistenButton = fn;
      })
      .catch((err) => {
        console.error('Failed to subscribe gamepad-button-state', err);
      });

    listen<GamepadAxisPayload>('gamepad-axis-state', (event) => {
      const { axis_id, value } = event.payload;
      if (axis_id === 0) setLeftStick((prev) => ({ ...prev, x: value }));
      else if (axis_id === 1) setLeftStick((prev) => ({ ...prev, y: value }));
      else if (axis_id === 2) setRightStick((prev) => ({ ...prev, x: value }));
      else if (axis_id === 3) setRightStick((prev) => ({ ...prev, y: value }));
    })
      .then((fn) => {
        unlistenAxis = fn;
      })
      .catch((err) => {
        console.error('Failed to subscribe gamepad-axis-state', err);
      });

    return () => {
      if (unlistenButton) unlistenButton();
      if (unlistenAxis) unlistenAxis();
    };
  }, []);

  useEffect(() => {
    let raf = 0;

    const pollBrowserGamepad = () => {
      const pads =
        typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
      const next: Record<number, boolean> = {};
      let lx = 0;
      let ly = 0;
      let rx = 0;
      let ry = 0;

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

          if (pad.axes && pad.axes.length >= 4) {
            lx = pad.axes[0] || 0;
            ly = pad.axes[1] || 0;
            rx = pad.axes[2] || 0;
            ry = pad.axes[3] || 0;
          }
        }
      }

      setPressedButtons(next);
      setLeftStick({ x: lx, y: ly });
      setRightStick({ x: rx, y: ry });
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

  const isLeftStickActive = Math.sqrt(leftStick.x * leftStick.x + leftStick.y * leftStick.y) > 0.12;
  const isRightStickActive = Math.sqrt(rightStick.x * rightStick.x + rightStick.y * rightStick.y) > 0.12;
  const leftStickGlowing = pressedLS || isLeftStickActive;
  const rightStickGlowing = pressedRS || isRightStickActive;

  const handleControlClick = (buttonId: number, label: string) => {
    onButtonPress(label);
    onControlSelect?.(buttonId, label);
  };

  // Render on-controller key mapping badges with HUD dotted lines
  const renderMappingBadge = (
    buttonId: number,
    x: number,
    y: number,
    lineTo: { x: number; y: number } | null
  ) => {
    const mapping = mappings.find((m) => m.button_id === buttonId);
    if (!mapping) return null;

    const keyText = mapping.key_str;
    // Calculate size dynamically
    const charWidth = 1.25;
    const paddingX = 1.5;
    const badgeWidth = Math.max(8, keyText.length * charWidth + paddingX * 2);
    const badgeHeight = 4.2;

    const rx = x - badgeWidth / 2;
    const ry = y - badgeHeight / 2;

    return (
      <g key={buttonId} className="pointer-events-none select-none animate-fade-in z-30">
        {lineTo && (
          <line
            x1={x}
            y1={y}
            x2={lineTo.x}
            y2={lineTo.y}
            stroke="var(--primary)"
            strokeWidth="0.22"
            strokeDasharray="0.6, 0.6"
            opacity="0.75"
          />
        )}
        <rect
          x={rx}
          y={ry}
          width={badgeWidth}
          height={badgeHeight}
          rx="1"
          fill="#09090b"
          stroke="var(--primary)"
          strokeWidth="0.35"
          opacity="0.9"
          style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.6))' }}
        />
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="2.1"
          fontWeight="bold"
          fill="var(--primary-text)"
          fontFamily="monospace"
          letterSpacing="0.1"
        >
          {keyText}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full max-w-[480px] aspect-5/3 my-4 group select-none">
      <style>{`
        @keyframes ledPulse {
          0%, 100% { opacity: 0.35; filter: drop-shadow(0 0 1px var(--primary-glow)); }
          50% { opacity: 1.0; filter: drop-shadow(0 0 4px var(--primary)); }
        }
        .animate-led {
          animation: ledPulse 2s infinite ease-in-out;
        }
        .g-element {
          transition: transform 0.15s cubic-bezier(0.2, 0, 0.2, 1), filter 0.15s ease;
        }
        .g-element:hover {
          filter: brightness(1.2);
        }
      `}</style>
      <svg
        className="w-full h-full text-zinc-700 transition-colors duration-300 overflow-visible"
        viewBox="0 0 100 60"
        fill="currentColor"
      >
        <defs>
          {/* Neon Glow Filter */}
          <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="1.0" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Stick Deep Recess Well Gradient */}
          <radialGradient id="stickWellGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#050507" />
            <stop offset="70%" stopColor="#111113" />
            <stop offset="100%" stopColor="#1f1f23" />
          </radialGradient>

          {/* Stick Cap Surface Radial Gradient */}
          <radialGradient id="stickGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#37373f" />
            <stop offset="70%" stopColor="#202024" />
            <stop offset="100%" stopColor="#0f0f11" />
          </radialGradient>

          {/* Controller Body Shell Gradient */}
          <radialGradient id="bodyGrad" cx="50%" cy="35%" r="65%" fx="50%" fy="25%">
            <stop offset="0%" stopColor="#252528" />
            <stop offset="60%" stopColor="#17171a" />
            <stop offset="100%" stopColor="#0b0b0d" />
          </radialGradient>

          {/* Grip Panels */}
          <linearGradient id="gripGradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#101012" />
            <stop offset="75%" stopColor="#1a1a1d" />
            <stop offset="100%" stopColor="#111113" />
          </linearGradient>
          <linearGradient id="gripGradRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#111113" />
            <stop offset="25%" stopColor="#1a1a1d" />
            <stop offset="100%" stopColor="#101012" />
          </linearGradient>

          {/* Action Button Well Gradient */}
          <radialGradient id="buttonWellGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#08080a" />
            <stop offset="85%" stopColor="#121215" />
            <stop offset="100%" stopColor="#242428" />
          </radialGradient>

          {/* Button Bevel Drop Shadow */}
          <filter id="btnShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0.6" stdDeviation="0.4" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Outer Shadow of Controller Body */}
        <path
          d="M 20 15 C 35 15, 38 22, 50 22 C 62 22, 65 15, 80 15 C 95 15, 96 35, 88 55 C 84 62, 70 55, 62 48 C 55 45, 45 45, 38 48 C 30 55, 16 62, 12 55 C 4 35, 5 15, 20 15 Z"
          fill="#000"
          opacity="0.4"
          style={{ filter: 'blur(2.5px)', transform: 'translateY(1.5px)' }}
        />

        {/* Triggers (LT & RT) - Sitting behind bumpers */}
        
        {/* Left Trigger (LT) */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(6, 'Left Trigger')}
        >
          {/* Base trigger path */}
          <path
            d="M 21.5 11.5 C 21.5 11.5, 21.5 4.5, 22.5 4.0 C 23.5 3.5, 26.0 3.5, 27.0 4.0 C 28.0 4.5, 28.0 11.5, 28.0 11.5 Z"
            fill={pressedLT ? 'var(--primary)' : '#18181b'}
            filter={pressedLT ? 'url(#glow)' : undefined}
            stroke={pressedLT ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedLT ? 'translateY(0.8px)' : 'none',
              transformOrigin: '24.7px 11.5px'
            }}
          />
          {/* Inner Trigger Notch Accent */}
          <line
            x1="24.75"
            y1="5"
            x2="24.75"
            y2="8"
            stroke={pressedLT ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.1)'}
            strokeWidth="0.5"
            strokeLinecap="round"
            style={{ transform: pressedLT ? 'translateY(0.8px)' : 'none' }}
          />
          <title>{getMappingText(6, 'Left Trigger (LT)')}</title>
        </g>

        {/* Right Trigger (RT) */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(7, 'Right Trigger')}
        >
          <path
            d="M 72.0 11.5 C 72.0 11.5, 72.0 4.5, 73.0 4.0 C 74.0 3.5, 76.5 3.5, 77.5 4.0 C 78.5 4.5, 78.5 11.5, 78.5 11.5 Z"
            fill={pressedRT ? 'var(--primary)' : '#18181b'}
            filter={pressedRT ? 'url(#glow)' : undefined}
            stroke={pressedRT ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedRT ? 'translateY(0.8px)' : 'none',
              transformOrigin: '75.25px 11.5px'
            }}
          />
          {/* Inner Trigger Notch Accent */}
          <line
            x1="75.25"
            y1="5"
            x2="75.25"
            y2="8"
            stroke={pressedRT ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.1)'}
            strokeWidth="0.5"
            strokeLinecap="round"
            style={{ transform: pressedRT ? 'translateY(0.8px)' : 'none' }}
          />
          <title>{getMappingText(7, 'Right Trigger (RT)')}</title>
        </g>

        {/* Bumpers (LB & RB) - Curved ergonomic plates */}
        
        {/* Left Bumper (LB) */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(4, 'Left Bumper')}
        >
          <path
            d="M 18.0 14.5 C 22.0 13.5, 27.0 13.5, 31.0 14.2 L 31.5 11.2 C 27.0 10.2, 21.0 10.2, 17.0 11.8 Z"
            fill={pressedLB ? 'var(--primary)' : '#27272c'}
            filter={pressedLB ? 'url(#glow)' : undefined}
            stroke={pressedLB ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedLB ? 'translate(0.2px, 0.4px) scale(0.98)' : 'none',
              transformOrigin: '24.5px 12.5px'
            }}
          />
          <title>{getMappingText(4, 'Left Bumper (LB)')}</title>
        </g>

        {/* Right Bumper (RB) */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(5, 'Right Bumper')}
        >
          <path
            d="M 82.0 14.5 C 78.0 13.5, 73.0 13.5, 69.0 14.2 L 68.5 11.2 C 73.0 10.2, 79.0 10.2, 83.0 11.8 Z"
            fill={pressedRB ? 'var(--primary)' : '#27272c'}
            filter={pressedRB ? 'url(#glow)' : undefined}
            stroke={pressedRB ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedRB ? 'translate(-0.2px, 0.4px) scale(0.98)' : 'none',
              transformOrigin: '75.5px 12.5px'
            }}
          />
          <title>{getMappingText(5, 'Right Bumper (RB)')}</title>
        </g>

        {/* Gamepad Body Shell */}
        <path
          d="M 20 15 C 35 15, 38 22, 50 22 C 62 22, 65 15, 80 15 C 95 15, 96 35, 88 55 C 84 62, 70 55, 62 48 C 55 45, 45 45, 38 48 C 30 55, 16 62, 12 55 C 4 35, 5 15, 20 15 Z"
          fill="url(#bodyGrad)"
          stroke="var(--border-main)"
          strokeWidth="0.75"
        />

        {/* Symmetrical Ergonomic Rubberized Grips (Two-Tone panel overlay) */}
        <path
          d="M 12 55 C 16 62, 30 55, 38 48 C 32 40, 24 25, 20 15 C 5 15, 4 35, 12 55 Z"
          fill="url(#gripGradLeft)"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.4"
          opacity="0.75"
        />
        <path
          d="M 88 55 C 84 62, 70 55, 62 48 C 68 40, 76 25, 80 15 C 95 15, 96 35, 88 55 Z"
          fill="url(#gripGradRight)"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.4"
          opacity="0.75"
        />

        {/* Seam line highlights for grip assembly */}
        <path
          d="M 20 15 C 24 25, 32 40, 38 48"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="0.35"
          fill="none"
        />
        <path
          d="M 80 15 C 76 25, 68 40, 62 48"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="0.35"
          fill="none"
        />

        {/* Breathing LED Lightbar Chevron (Top Center) */}
        <g opacity={engineRunning ? 1.0 : 0.45}>
          {/* Backplate */}
          <path
            d="M 44.5 22.2 Q 50 24.2 55.5 22.2 L 55 23.5 Q 50 25.5 45 23.5 Z"
            fill="#121214"
          />
          {/* LED bar */}
          <path
            d="M 45 22.5 Q 50 24.5 55 22.5 L 54.5 23.4 Q 50 25.3 45.5 23.4 Z"
            fill="var(--primary)"
            filter="url(#glow)"
            className={engineRunning ? 'animate-led' : ''}
          />
        </g>

        {/* Mode / Guide Button (Center Logo Button) */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(10, 'Mode Button')}
        >
          {/* Button recess bevel */}
          <circle
            cx="50"
            cy="29"
            r="3.8"
            fill="#09090b"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="0.3"
          />
          {/* Button Cap */}
          <circle
            cx="50"
            cy="29"
            r="3.2"
            fill={pressedMode ? 'var(--primary)' : '#1b1b1f'}
            filter={pressedMode ? 'url(#glow)' : undefined}
            stroke={pressedMode ? 'var(--primary-hover)' : 'var(--border-main)'}
            strokeWidth="0.6"
            className="transition-all duration-150"
            style={{
              transform: pressedMode ? 'scale(0.92)' : 'none',
              transformOrigin: '50px 29px'
            }}
          />
          {/* Glowing central ring */}
          <circle
            cx="50"
            cy="29"
            r="1.6"
            fill="none"
            stroke={pressedMode ? '#ffffff' : 'var(--border-main)'}
            strokeWidth="0.45"
            opacity="0.8"
            style={{
              transform: pressedMode ? 'scale(0.92)' : 'none',
              transformOrigin: '50px 29px'
            }}
          />
          <title>{getMappingText(10, 'Home / Mode Button')}</title>
        </g>

        {/* Select / Back Button */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(8, 'Select Button')}
        >
          {/* Bevel Recess Well */}
          <rect
            x="38.4"
            y="26.9"
            width="5.2"
            height="3.2"
            rx="1.0"
            transform="rotate(-15 41 28.5)"
            fill="#070709"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="0.3"
          />
          {/* Button capsule & icon */}
          <g
            className="transition-all duration-150"
            style={{
              transform: pressedSelect ? 'rotate(-15deg) scale(0.9)' : 'rotate(-15deg)',
              transformOrigin: '41px 28.5px'
            }}
          >
            <rect
              x="39.0"
              y="27.5"
              width="4.0"
              height="2.0"
              rx="0.75"
              fill={pressedSelect ? 'var(--primary)' : '#4b5563'}
              filter={pressedSelect ? 'url(#glow)' : undefined}
              stroke={pressedSelect ? 'var(--primary-hover)' : 'rgba(255, 255, 255, 0.35)'}
              strokeWidth="0.4"
            />
          </g>
          <title>{getMappingText(8, 'Select / Back Button')}</title>
        </g>

        {/* Start / Options Button */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(9, 'Start Button')}
        >
          {/* Bevel Recess Well */}
          <rect
            x="56.4"
            y="26.9"
            width="5.2"
            height="3.2"
            rx="1.0"
            transform="rotate(15 59 28.5)"
            fill="#070709"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="0.3"
          />
          {/* Button capsule & icon */}
          <g
            className="transition-all duration-150"
            style={{
              transform: pressedStart ? 'rotate(15deg) scale(0.9)' : 'rotate(15deg)',
              transformOrigin: '59px 28.5px'
            }}
          >
            <rect
              x="57.0"
              y="27.5"
              width="4.0"
              height="2.0"
              rx="0.75"
              fill={pressedStart ? 'var(--primary)' : '#4b5563'}
              filter={pressedStart ? 'url(#glow)' : undefined}
              stroke={pressedStart ? 'var(--primary-hover)' : 'rgba(255, 255, 255, 0.35)'}
              strokeWidth="0.4"
            />
          </g>
          <title>{getMappingText(9, 'Start / Options Button')}</title>
        </g>

        {/* D-Pad Base / Recess dish */}
        <circle
          cx="25"
          cy="31"
          r="8.2"
          fill="url(#stickWellGrad)"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.5"
        />

        {/* Interactive D-Pad Cross */}
        <g>
          {/* Main Cross shadow base */}
          <path
            d="M 23.5 26 h 3 v 10 h -3 z M 20 29.5 h 10 v 3 h -10 z"
            fill="#121214"
            opacity="0.5"
          />

          {/* D-Pad Up */}
          <g
            className="cursor-pointer g-element"
            onClick={() => handleControlClick(13, 'D-Pad Up')}
          >
            <path
              d="M 23.5 29.5 H 26.5 V 26 C 26.5 25.1, 23.5 25.1, 23.5 26 Z"
              fill={pressedDUp ? 'var(--primary)' : '#28282d'}
              filter={pressedDUp ? 'url(#glow)' : undefined}
              stroke={pressedDUp ? 'var(--primary-hover)' : 'var(--border-main)'}
              strokeWidth="0.4"
              className="transition-all duration-100"
              style={{
                transform: pressedDUp ? 'translateY(0.4px)' : 'none'
              }}
            />
            {/* Arrow Glyphs */}
            <path
              d="M 25 26.8 L 26.1 28 L 23.9 28 Z"
              fill={pressedDUp ? '#ffffff' : 'rgba(255,255,255,0.2)'}
            />
            <title>{getMappingText(13, 'D-Pad Up')}</title>
          </g>

          {/* D-Pad Down */}
          <g
            className="cursor-pointer g-element"
            onClick={() => handleControlClick(14, 'D-Pad Down')}
          >
            <path
              d="M 23.5 32.5 H 26.5 V 36 C 26.5 36.9, 23.5 36.9, 23.5 36 Z"
              fill={pressedDDown ? 'var(--primary)' : '#28282d'}
              filter={pressedDDown ? 'url(#glow)' : undefined}
              stroke={pressedDDown ? 'var(--primary-hover)' : 'var(--border-main)'}
              strokeWidth="0.4"
              className="transition-all duration-100"
              style={{
                transform: pressedDDown ? 'translateY(-0.4px)' : 'none'
              }}
            />
            <path
              d="M 25 35.2 L 26.1 34 L 23.9 34 Z"
              fill={pressedDDown ? '#ffffff' : 'rgba(255,255,255,0.2)'}
            />
            <title>{getMappingText(14, 'D-Pad Down')}</title>
          </g>

          {/* D-Pad Left */}
          <g
            className="cursor-pointer g-element"
            onClick={() => handleControlClick(15, 'D-Pad Left')}
          >
            <path
              d="M 23.5 29.5 V 32.5 H 20 C 19.1 32.5, 19.1 29.5, 20 29.5 Z"
              fill={pressedDLeft ? 'var(--primary)' : '#28282d'}
              filter={pressedDLeft ? 'url(#glow)' : undefined}
              stroke={pressedDLeft ? 'var(--primary-hover)' : 'var(--border-main)'}
              strokeWidth="0.4"
              className="transition-all duration-100"
              style={{
                transform: pressedDLeft ? 'translateX(0.4px)' : 'none'
              }}
            />
            <path
              d="M 20.8 31 L 22 29.9 L 22 32.1 Z"
              fill={pressedDLeft ? '#ffffff' : 'rgba(255,255,255,0.2)'}
            />
            <title>{getMappingText(15, 'D-Pad Left')}</title>
          </g>

          {/* D-Pad Right */}
          <g
            className="cursor-pointer g-element"
            onClick={() => handleControlClick(16, 'D-Pad Right')}
          >
            <path
              d="M 26.5 29.5 V 32.5 H 30 C 30.9 32.5, 30.9 29.5, 30 29.5 Z"
              fill={pressedDRight ? 'var(--primary)' : '#28282d'}
              filter={pressedDRight ? 'url(#glow)' : undefined}
              stroke={pressedDRight ? 'var(--primary-hover)' : 'var(--border-main)'}
              strokeWidth="0.4"
              className="transition-all duration-100"
              style={{
                transform: pressedDRight ? 'translateX(-0.4px)' : 'none'
              }}
            />
            <path
              d="M 29.2 31 L 28 29.9 L 28 32.1 Z"
              fill={pressedDRight ? '#ffffff' : 'rgba(255,255,255,0.2)'}
            />
            <title>{getMappingText(16, 'D-Pad Right')}</title>
          </g>
        </g>

        {/* Left Thumbstick (LS) with 3D tilts */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(11, 'Left Stick')}
        >
          {/* Deep stick recess well */}
          <circle
            cx="36"
            cy="44"
            r="7.8"
            fill="url(#stickWellGrad)"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="0.5"
          />
          
          {/* Stick shaft stem rendering (Pivoting metal cylinder) */}
          <line
            x1="36"
            y1="44"
            x2={36 + leftStick.x * 2.2}
            y2={44 + leftStick.y * 2.2}
            stroke="#b4b4b8"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="transition-all duration-75 ease-out"
          />

          {/* Dynamic Cap Shadow (moves in opposite direction to stick tilt) */}
          <circle
            cx={36 + leftStick.x * 1.5 - leftStick.x * 0.8}
            cy={44 + leftStick.y * 1.5 - leftStick.y * 0.8}
            r="4.8"
            fill="#000"
            opacity="0.65"
            style={{ filter: 'blur(0.8px)' }}
            className="transition-all duration-75 ease-out"
          />

          {/* Stick Cap */}
          <g
            style={{
              transform: `translate(${leftStick.x * 2.5}px, ${leftStick.y * 2.5}px)`
            }}
            className="transition-transform duration-75 ease-out"
          >
            {/* Outer rubberized grip ring */}
            <circle
              cx="36"
              cy="44"
              r="4.8"
              fill="url(#stickGrad)"
              stroke={leftStickGlowing ? 'var(--primary)' : '#333338'}
              strokeWidth="0.65"
              className={`transition-all duration-150 ${pressedLS ? 'scale-90' : ''}`}
              style={{ transformOrigin: '36px 44px' }}
            />
            {/* Center thumb concave dish */}
            <circle
              cx={36 - leftStick.x * 0.4}
              cy={44 - leftStick.y * 0.4}
              r="3.2"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="0.4"
            />
            {/* Tiny notch guidelines at N, S, E, W */}
            <line x1="36" y1="39.6" x2="36" y2="40.3" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
            <line x1="36" y1="47.7" x2="36" y2="48.4" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
            <line x1="31.6" y1="44" x2="32.3" y2="44" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
            <line x1="39.7" y1="44" x2="40.4" y2="44" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
          </g>
          <title>{getMappingText(11, 'Left Stick Click (LS / L3)')}</title>
        </g>

        {/* Right Thumbstick (RS) with 3D tilts */}
        <g
          className="cursor-pointer"
          onClick={() => handleControlClick(12, 'Right Stick')}
        >
          {/* Deep stick recess well */}
          <circle
            cx="64"
            cy="44"
            r="7.8"
            fill="url(#stickWellGrad)"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="0.5"
          />

          {/* Stick shaft stem */}
          <line
            x1="64"
            y1="44"
            x2={64 + rightStick.x * 2.2}
            y2={44 + rightStick.y * 2.2}
            stroke="#b4b4b8"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="transition-all duration-75 ease-out"
          />

          {/* Dynamic Cap Shadow */}
          <circle
            cx={64 + rightStick.x * 1.5 - rightStick.x * 0.8}
            cy={44 + rightStick.y * 1.5 - rightStick.y * 0.8}
            r="4.8"
            fill="#000"
            opacity="0.65"
            style={{ filter: 'blur(0.8px)' }}
            className="transition-all duration-75 ease-out"
          />

          {/* Stick Cap */}
          <g
            style={{
              transform: `translate(${rightStick.x * 2.5}px, ${rightStick.y * 2.5}px)`
            }}
            className="transition-transform duration-75 ease-out"
          >
            {/* Outer rubberized ring */}
            <circle
              cx="64"
              cy="44"
              r="4.8"
              fill="url(#stickGrad)"
              stroke={rightStickGlowing ? 'var(--primary)' : '#333338'}
              strokeWidth="0.65"
              className={`transition-all duration-150 ${pressedRS ? 'scale-90' : ''}`}
              style={{ transformOrigin: '64px 44px' }}
            />
            {/* Center Concave Dish */}
            <circle
              cx={64 - rightStick.x * 0.4}
              cy={44 - rightStick.y * 0.4}
              r="3.2"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="0.4"
            />
            {/* Notches */}
            <line x1="64" y1="39.6" x2="64" y2="40.3" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
            <line x1="64" y1="47.7" x2="64" y2="48.4" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
            <line x1="59.6" y1="44" x2="60.3" y2="44" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
            <line x1="67.7" y1="44" x2="68.4" y2="44" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
          </g>
          <title>{getMappingText(12, 'Right Stick Click (RS / R3)')}</title>
        </g>

        {/* Face Buttons Well Cover Plate */}
        <circle
          cx="75"
          cy="31"
          r="9.0"
          fill="url(#buttonWellGrad)"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="0.45"
        />

        {/* Face Buttons Cluster (Y, X, B, A) - Glassmorphism Styling */}
        
        {/* Y Button (North) - Gold Amber theme */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(3, 'Y Button')}
          style={{ filter: 'url(#btnShadow)' }}
        >
          {/* Button core cap */}
          <circle
            cx="75"
            cy="25.8"
            r="2.3"
            fill={pressedY ? '#fbbf24' : '#27272a'}
            filter={pressedY ? 'url(#glow)' : undefined}
            stroke={pressedY ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedY ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '75px 25.8px'
            }}
          />
          {/* Glass Highlight Overlay */}
          <circle
            cx="74.2"
            cy="25.0"
            r="1.2"
            fill="rgba(255, 255, 255, 0.08)"
            style={{ pointerEvents: 'none' }}
          />
          {/* Button Text */}
          <text
            x="75"
            y="26.6"
            textAnchor="middle"
            fontSize="2.4"
            fontWeight="bold"
            fill={pressedY ? '#000000' : '#fbbf24'}
            pointerEvents="none"
            style={{
              transform: pressedY ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '75px 25.8px',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            Y
          </text>
          <title>{getMappingText(3, 'Y Button')}</title>
        </g>

        {/* X Button (West) - Blue Cyan theme */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(2, 'X Button')}
          style={{ filter: 'url(#btnShadow)' }}
        >
          <circle
            cx="69.8"
            cy="31"
            r="2.3"
            fill={pressedX ? '#38bdf8' : '#27272a'}
            filter={pressedX ? 'url(#glow)' : undefined}
            stroke={pressedX ? '#0284c7' : 'rgba(255, 255, 255, 0.08)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedX ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '69.8px 31px'
            }}
          />
          <circle
            cx="69.0"
            cy="30.2"
            r="1.2"
            fill="rgba(255, 255, 255, 0.08)"
            style={{ pointerEvents: 'none' }}
          />
          <text
            x="69.8"
            y="31.8"
            textAnchor="middle"
            fontSize="2.4"
            fontWeight="bold"
            fill={pressedX ? '#000000' : '#38bdf8'}
            pointerEvents="none"
            style={{
              transform: pressedX ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '69.8px 31px',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            X
          </text>
          <title>{getMappingText(2, 'X Button')}</title>
        </g>

        {/* B Button (East) - Red Pink theme */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(1, 'B Button')}
          style={{ filter: 'url(#btnShadow)' }}
        >
          <circle
            cx="80.2"
            cy="31"
            r="2.3"
            fill={pressedB ? '#f87171' : '#27272a'}
            filter={pressedB ? 'url(#glow)' : undefined}
            stroke={pressedB ? '#dc2626' : 'rgba(255, 255, 255, 0.08)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedB ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '80.2px 31px'
            }}
          />
          <circle
            cx="79.4"
            cy="30.2"
            r="1.2"
            fill="rgba(255, 255, 255, 0.08)"
            style={{ pointerEvents: 'none' }}
          />
          <text
            x="80.2"
            y="31.8"
            textAnchor="middle"
            fontSize="2.4"
            fontWeight="bold"
            fill={pressedB ? '#000000' : '#f87171'}
            pointerEvents="none"
            style={{
              transform: pressedB ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '80.2px 31px',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            B
          </text>
          <title>{getMappingText(1, 'B Button')}</title>
        </g>

        {/* A Button (South) - Emerald Green theme */}
        <g
          className="cursor-pointer g-element"
          onClick={() => handleControlClick(0, 'A Button')}
          style={{ filter: 'url(#btnShadow)' }}
        >
          <circle
            cx="75"
            cy="36.2"
            r="2.3"
            fill={pressedA ? '#34d399' : '#27272a'}
            filter={pressedA ? 'url(#glow)' : undefined}
            stroke={pressedA ? '#059669' : 'rgba(255, 255, 255, 0.08)'}
            strokeWidth="0.4"
            className="transition-all duration-150"
            style={{
              transform: pressedA ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '75px 36.2px'
            }}
          />
          <circle
            cx="74.2"
            cy="35.4"
            r="1.2"
            fill="rgba(255, 255, 255, 0.08)"
            style={{ pointerEvents: 'none' }}
          />
          <text
            x="75"
            y="37.0"
            textAnchor="middle"
            fontSize="2.4"
            fontWeight="bold"
            fill={pressedA ? '#000000' : '#34d399'}
            pointerEvents="none"
            style={{
              transform: pressedA ? 'scale(0.92) translateY(0.2px)' : 'none',
              transformOrigin: '75px 36.2px',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            A
          </text>
          <title>{getMappingText(0, 'A Button')}</title>
        </g>

        {/* Key Mapping HUD Badges */}
        {renderMappingBadge(6, 13, 3, { x: 23, y: 7 })}       {/* LT */}
        {renderMappingBadge(4, 12, 9, { x: 21, y: 11.5 })}    {/* LB */}
        {renderMappingBadge(7, 87, 3, { x: 77, y: 7 })}       {/* RT */}
        {renderMappingBadge(5, 88, 9, { x: 79, y: 11.5 })}    {/* RB */}
        {renderMappingBadge(13, 25, 17, { x: 25, y: 26.5 })}  {/* D-Pad Up */}
        {renderMappingBadge(14, 25, 45, { x: 25, y: 35.5 })}  {/* D-Pad Down */}
        {renderMappingBadge(15, 10, 31, { x: 20.5, y: 31 })}  {/* D-Pad Left */}
        {renderMappingBadge(16, 39, 31, { x: 29.5, y: 31 })}  {/* D-Pad Right */}
        {renderMappingBadge(11, 36, 55, { x: 36, y: 44 })}    {/* Left Stick (LS) */}
        {renderMappingBadge(12, 64, 55, { x: 64, y: 44 })}    {/* Right Stick (RS) */}
        {renderMappingBadge(8, 41, 19, { x: 41, y: 28 })}     {/* Select */}
        {renderMappingBadge(9, 59, 19, { x: 59, y: 28 })}     {/* Start */}
        {renderMappingBadge(10, 50, 19, { x: 50, y: 29 })}    {/* Mode */}
        {renderMappingBadge(3, 75, 17, { x: 75, y: 24.5 })}   {/* Y Button */}
        {renderMappingBadge(2, 61, 31, { x: 68.5, y: 31 })}   {/* X Button */}
        {renderMappingBadge(1, 89, 31, { x: 81.5, y: 31 })}   {/* B Button */}
        {renderMappingBadge(0, 75, 45, { x: 75, y: 37.5 })}   {/* A Button */}
      </svg>
    </div>
  );
}

export default Gamepad;
