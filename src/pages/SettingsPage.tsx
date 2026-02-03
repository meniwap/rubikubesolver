import { useGameStore } from "../state/gameStore";

export function SettingsPage() {
  const ms = useGameStore((s) => s.settings.animationMs);
  const set = useGameStore((s) => s.setAnimationMs);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <div className="rounded-xl bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold">מהירות אנימציה</div>
            <div className="text-xs text-white/70">משך זמן למהלך (במילישניות)</div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-1 font-mono text-sm">{ms}ms</div>
        </div>

        <input
          className="mt-4 w-full accent-white"
          type="range"
          min={60}
          max={900}
          step={10}
          value={ms}
          onChange={(e) => set(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

