interface GamepadProps {
  onButtonPress: (button: string) => void;
}

export function Gamepad({ onButtonPress }: GamepadProps) {
  return (
    <div className="relative w-80 h-48 my-8 group">
      {/* Pulsing highlights for buttons using theme variables */}
      <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-primary/20 rounded-full animate-ping pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-primary/15 rounded-full animate-ping pointer-events-none" />

      <svg
        className="w-full h-full text-zinc-700 transition-colors group-hover:text-zinc-600"
        style={{
          filter: 'drop-shadow(0px 0px 12px var(--primary-glow))'
        }}
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
        <path d="M 22 28 h 6 v 6 h -6 z" fill="var(--bg-main)" />
        <path d="M 24 26 h 2 v 10 h -2 z" fill="var(--bg-main)" />
        {/* Left Stick */}
        <circle
          cx="34"
          cy="38"
          r="6"
          fill="var(--bg-main)"
          stroke="var(--primary)"
          strokeWidth="0.75"
        />
        <circle cx="34" cy="38" r="3" fill="var(--border-main)" />
        {/* Right Stick */}
        <circle
          cx="66"
          cy="38"
          r="6"
          fill="var(--bg-main)"
          stroke="var(--primary)"
          strokeWidth="0.75"
        />
        <circle cx="66" cy="38" r="3" fill="var(--border-main)" />
        {/* Action Buttons */}
        <circle cx="78" cy="28" r="2" fill="#e4e4e7" /> {/* Y */}
        <circle cx="74" cy="32" r="2" fill="#e4e4e7" /> {/* X */}
        <circle cx="82" cy="32" r="2" fill="#e4e4e7" /> {/* B */}
        <circle cx="78" cy="36" r="2" fill="var(--primary)" /> {/* A */}
      </svg>

      {/* Simulated Interactive buttons on overlay */}
      <button
        onClick={() => onButtonPress('L-Stick')}
        className="absolute top-[55%] left-[30%] w-7 h-7 rounded-full bg-primary-bg/50 hover:bg-primary/20 border border-primary-border/60 cursor-pointer transition-all"
        title="Click to simulate Left Stick input"
      />
      <button
        onClick={() => onButtonPress('R-Stick')}
        className="absolute top-[55%] right-[30%] w-7 h-7 rounded-full bg-primary-bg/50 hover:bg-primary/20 border border-primary-border/60 cursor-pointer transition-all"
        title="Click to simulate Right Stick input"
      />
      <button
        onClick={() => onButtonPress('A Button')}
        className="absolute top-[52%] right-[19%] w-5 h-5 rounded-full bg-primary-bg/50 hover:bg-primary/20 border border-primary-border/60 cursor-pointer transition-all"
        title="Click to simulate A button input"
      />
    </div>
  );
}
export default Gamepad;
