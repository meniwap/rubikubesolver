import { useGameStore } from "../state/gameStore";

export function SettingsPage() {
  const ms = useGameStore((s) => s.settings.animationMs);
  const set = useGameStore((s) => s.setAnimationMs);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="page-title">הגדרות</h1>
      </div>

      {/* Settings Cards */}
      <div className="flex flex-col gap-4">
        {/* Animation Speed */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-2.5">
                <SpeedIcon />
              </div>
              <div>
                <h3 className="font-semibold">מהירות אנימציה</h3>
                <p className="mt-1 text-sm text-white/50">משך זמן למהלך בודד</p>
              </div>
            </div>
            <div className="glass-card px-4 py-2 text-center">
              <span className="font-mono text-lg font-bold text-purple-300">{ms}</span>
              <span className="text-xs text-white/40">ms</span>
            </div>
          </div>

          <div className="mt-6">
            <input
              className="input-range"
              type="range"
              min={60}
              max={900}
              step={10}
              value={ms}
              onChange={(e) => set(Number(e.target.value))}
            />
            <div className="mt-2 flex justify-between text-xs text-white/40">
              <span>מהיר</span>
              <span>איטי</span>
            </div>
          </div>

          {/* Speed Presets */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <SpeedPreset label="מהיר" value={100} current={ms} onSelect={set} />
            <SpeedPreset label="רגיל" value={200} current={ms} onSelect={set} />
            <SpeedPreset label="איטי" value={400} current={ms} onSelect={set} />
            <SpeedPreset label="למידה" value={600} current={ms} onSelect={set} />
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-2.5">
              <KeyboardIcon />
            </div>
            <div>
              <h3 className="font-semibold">קיצורי מקלדת</h3>
              <p className="mt-1 text-sm text-white/50">שליטה מהירה בקובייה</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <ShortcutRow keys={["U", "R", "F", "D", "L", "B"]} description="מהלכים (עם Shift = הפוך)" />
            <ShortcutRow keys={["Space"]} description="התחל/עצור טיימר" />
            <ShortcutRow keys={["Z"]} description="בטל מהלך אחרון" />
            <ShortcutRow keys={["Y"]} description="חזור על מהלך" />
            <ShortcutRow keys={["F"]} description="מסך מלא לקובייה" />
          </div>
        </div>

        {/* About */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-2.5">
              <CubeIcon />
            </div>
            <div>
              <h3 className="font-semibold">אודות</h3>
              <p className="mt-1 text-sm text-white/50">Rubik's Cube Solver</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-white/60">
            <p>
              אפליקציה לפתרון קוביה הונגרית. תומכת בשיטת מתחילים ובפתרון אופטימלי.
              ניתן לסרוק קובייה עם מצלמה או להזין ידנית.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
              <span>Built with</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5">React</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5">Three.js</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5">Tailwind</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeedPreset(props: { label: string; value: number; current: number; onSelect: (v: number) => void }) {
  const isActive = props.current === props.value;
  return (
    <button
      className={`rounded-xl py-2 text-xs font-medium transition-all ${
        isActive
          ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white"
          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
      }`}
      onClick={() => props.onSelect(props.value)}
    >
      {props.label}
    </button>
  );
}

function ShortcutRow(props: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex flex-wrap gap-1">
        {props.keys.map((key) => (
          <kbd
            key={key}
            className="rounded-md bg-white/10 px-2 py-1 font-mono text-xs font-semibold text-white/80"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-xs text-white/50">{props.description}</span>
    </div>
  );
}

// Icons
function SpeedIcon() {
  return (
    <svg className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <line x1="6" y1="8" x2="6.01" y2="8" />
      <line x1="10" y1="8" x2="10.01" y2="8" />
      <line x1="14" y1="8" x2="14.01" y2="8" />
      <line x1="18" y1="8" x2="18.01" y2="8" />
      <line x1="8" y1="12" x2="8.01" y2="12" />
      <line x1="12" y1="12" x2="12.01" y2="12" />
      <line x1="16" y1="12" x2="16.01" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
