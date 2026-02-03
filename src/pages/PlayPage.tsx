import { useEffect, useState } from "react";
import { CubeViewport } from "../components/CubeViewport";
import { MovePad } from "../components/MovePad";
import type { Face, Move } from "../cube/types";
import { moveToToken } from "../cube/notation";
import { useGameStore } from "../state/gameStore";
import { formatMs } from "../utils/time";

export function PlayPage() {
  const scramble = useGameStore((s) => s.scramble);
  const reset = useGameStore((s) => s.reset);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redoMove);
  const requestHint = useGameStore((s) => s.requestHint);
  const requestSolveOptimal = useGameStore((s) => s.requestSolveOptimal);
  const requestSolveBeginner = useGameStore((s) => s.requestSolveBeginner);
  const stopMoves = useGameStore((s) => s.stopMoves);
  const enqueueMoves = useGameStore((s) => s.enqueueMoves);
  const hint = useGameStore((s) => s.hint);
  const status = useGameStore((s) => s.status);
  const timer = useGameStore((s) => s.timer);
  const timerToggle = useGameStore((s) => s.timerToggle);
  const timerReset = useGameStore((s) => s.timerReset);
  const isAnimating = useGameStore((s) => s.isAnimating);
  const queueLength = useGameStore((s) => s.queue.length);
  const stats = useGameStore((s) => s.stats);
  const startSolve = useGameStore((s) => s.startSolve);
  const pendingTimerStart = useGameStore((s) => s.pendingTimerStart);
  const isSolved = useGameStore((s) => s.isSolved);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!timer.running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 50);
    return () => window.clearInterval(id);
  }, [timer.running]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        timerToggle();
        return;
      }
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      const parsed = parseMoveKey(e);
      if (parsed) {
        e.preventDefault();
        enqueueMoves([parsed], { recordHistory: true, source: "user" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enqueueMoves, redo, timerToggle, undo]);

  const shownMs =
    timer.elapsedMs + (timer.running && timer.startedAt ? Date.now() - timer.startedAt : 0) + tick * 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="page-title">משחק</h1>
          {isSolved && !isAnimating && (
            <span className="badge-success animate-fade-in">
              <svg className="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              פתור!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-card flex items-center gap-2 px-4 py-2">
            <TimerIcon />
            <span className="font-mono text-lg font-bold tabular-nums">{formatMs(shownMs)}</span>
          </div>
          <button
            className={`btn-secondary flex items-center gap-1.5 ${timer.running ? "!border-emerald-500/30 !bg-emerald-500/10" : ""}`}
            onClick={timerToggle}
          >
            {timer.running ? <PauseIcon /> : <PlayButtonIcon />}
            <span className="hidden sm:inline">{timer.running ? "עצור" : "התחל"}</span>
          </button>
          <button className="btn-ghost" onClick={timerReset} title="אפס טיימר">
            <ResetIcon />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,380px] lg:gap-6">
        {/* Cube Viewport */}
        <CubeViewport className="glass-card h-[320px] w-full sm:h-[400px] lg:h-[520px]" />

        {/* Controls Panel */}
        <div className="flex flex-col gap-4">
          {/* Main Actions */}
          <div className="glass-card p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn-primary flex items-center justify-center gap-2"
                disabled={isAnimating}
                onClick={scramble}
              >
                <ShuffleIcon />
                ערבב
              </button>
              <button
                className="btn-secondary flex items-center justify-center gap-2"
                disabled={isAnimating}
                onClick={() => reset({ keepFaceColors: true })}
              >
                <RefreshIcon />
                איפוס
              </button>
              <button
                className="btn-ghost flex items-center justify-center gap-2"
                disabled={isAnimating}
                onClick={undo}
              >
                <UndoIcon />
                בטל
              </button>
              <button
                className="btn-ghost flex items-center justify-center gap-2"
                disabled={isAnimating}
                onClick={redo}
              >
                <RedoIcon />
                חזור
              </button>
            </div>
          </div>

          {/* Solve Actions */}
          <div className="glass-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">פתרון</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              <button
                className="btn-success text-xs sm:text-sm"
                disabled={isAnimating}
                onClick={() => requestHint("optimal")}
              >
                💡 רמז (אופטימלי)
              </button>
              <button
                className="btn-success text-xs sm:text-sm"
                disabled={isAnimating}
                onClick={() => requestHint("beginner")}
              >
                🧩 רמז (מתחילים)
              </button>
              <button
                className="btn-info text-xs sm:text-sm"
                disabled={isAnimating}
                onClick={requestSolveBeginner}
              >
                📚 פתרו (מתחילים)
              </button>
              <button
                className="btn-accent text-xs sm:text-sm"
                disabled={isAnimating}
                onClick={requestSolveOptimal}
              >
                ⚡ פתרו (אופטימלי)
              </button>
            </div>
            <button
              className="btn-danger mt-3 w-full text-xs sm:text-sm"
              disabled={!isAnimating && queueLength === 0}
              onClick={stopMoves}
            >
              ⏹ עצור פתרון
            </button>
          </div>

          {/* Hint Display */}
          {hint && (
            <div className="hint-card animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{hint.title}</div>
                  <div className="mt-1 text-xs text-white/60">{hint.explanation}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="glass-card px-3 py-1.5 font-mono text-sm font-bold">
                    {hint.moves[0] ? moveToToken(hint.moves[0]) : "—"}
                  </span>
                  <button
                    className="btn-success py-1.5 text-xs"
                    disabled={isAnimating || hint.moves.length === 0}
                    onClick={() => enqueueMoves(hint.moves.slice(0, 1), { recordHistory: true, source: "user" })}
                  >
                    בצע
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Session Card */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">סשן פתירה</div>
                <div className="mt-0.5 text-xs text-white/50">ערבוב + טיימר אוטומטי</div>
              </div>
              <button
                className="btn-primary py-2 text-sm"
                disabled={isAnimating}
                onClick={startSolve}
              >
                🎮 התחל סשן
              </button>
            </div>
            {pendingTimerStart && (
              <div className="mt-3 rounded-lg bg-purple-500/10 px-3 py-2 text-xs text-purple-200">
                ⏱️ הטיימר יתחיל אחרי המהלך הראשון
              </div>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="הכי טוב" value={stats.bestMs ? formatMs(stats.bestMs) : "—"} highlight />
              <Stat label="אחרון" value={stats.lastMs ? formatMs(stats.lastMs) : "—"} />
              <Stat label="פתירות" value={String(stats.solves)} />
            </div>
          </div>

          {/* Move Pad */}
          <MovePad />

          {/* Status Message */}
          {status.kind !== "idle" && (
            <div
              className={`animate-fade-in ${
                status.kind === "error"
                  ? "status-error"
                  : status.kind === "loading"
                  ? "status-loading"
                  : "status-info"
              }`}
            >
              {"message" in status ? status.message : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseMoveKey(e: KeyboardEvent): Move | null {
  const key = e.key.toUpperCase();
  const faces = new Set<Face>(["U", "R", "F", "D", "L", "B"]);
  if (!faces.has(key as Face)) return null;
  const face = key as Face;
  return { face, amount: (e.shiftKey ? -1 : 1) as 1 | -1 };
}

function Stat(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`stat-card ${props.highlight ? "border-purple-500/30 bg-purple-500/10" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{props.label}</div>
      <div className={`mt-1 font-mono text-sm font-bold ${props.highlight ? "text-purple-200" : ""}`}>
        {props.value}
      </div>
    </div>
  );
}

// Icons
function TimerIcon() {
  return (
    <svg className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PlayButtonIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  );
}
