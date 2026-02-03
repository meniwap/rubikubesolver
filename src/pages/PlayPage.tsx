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
  const enqueueMoves = useGameStore((s) => s.enqueueMoves);
  const hint = useGameStore((s) => s.hint);
  const status = useGameStore((s) => s.status);
  const timer = useGameStore((s) => s.timer);
  const timerToggle = useGameStore((s) => s.timerToggle);
  const timerReset = useGameStore((s) => s.timerReset);
  const isAnimating = useGameStore((s) => s.isAnimating);
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Play</h1>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/10 px-3 py-1 font-mono text-sm">{formatMs(shownMs)}</div>
          {isSolved && !isAnimating && (
            <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
              פתור
            </div>
          )}
          <button
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={timerToggle}
          >
            {timer.running ? "עצור" : "התחל"}
          </button>
          <button
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={timerReset}
          >
            אפס טיימר
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CubeViewport className="h-[360px] w-full rounded-xl bg-white/5 lg:h-[520px]" />

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
              disabled={isAnimating}
              onClick={scramble}
            >
              Scramble
            </button>
            <button
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
              disabled={isAnimating}
              onClick={() => reset({ keepFaceColors: true })}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
              disabled={isAnimating}
              onClick={undo}
            >
              Undo
            </button>
            <button
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
              disabled={isAnimating}
              onClick={redo}
            >
              Redo
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50"
              disabled={isAnimating}
              onClick={requestHint}
            >
              רמז
            </button>
            <button
              className="rounded-lg bg-sky-500/20 px-3 py-2 text-sm font-semibold hover:bg-sky-500/30 disabled:opacity-50"
              disabled={isAnimating}
              onClick={requestSolveBeginner}
            >
              פתרו (מתחילים)
            </button>
            <button
              className="rounded-lg bg-fuchsia-500/20 px-3 py-2 text-sm font-semibold hover:bg-fuchsia-500/30 disabled:opacity-50"
              disabled={isAnimating}
              onClick={requestSolveOptimal}
            >
              פתרו (אופטימלי)
            </button>
          </div>

          {hint && (
            <div className="rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{hint.title}</div>
                  <div className="text-xs text-white/70">{hint.explanation}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white/10 px-3 py-1 font-mono text-sm">
                    {hint.moves[0] ? moveToToken(hint.moves[0]) : "—"}
                  </div>
                  <button
                    className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
                    disabled={isAnimating || hint.moves.length === 0}
                    onClick={() => enqueueMoves(hint.moves.slice(0, 1), { recordHistory: true, source: "user" })}
                  >
                    בצע רמז
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">Solve Session</div>
                <div className="text-xs text-white/70">מערבב ומתחיל טיימר אוטומטי.</div>
              </div>
              <button
                className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
                disabled={isAnimating}
                onClick={startSolve}
              >
                התחל סשן
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="Best" value={stats.bestMs ? formatMs(stats.bestMs) : "—"} />
              <Stat label="Last" value={stats.lastMs ? formatMs(stats.lastMs) : "—"} />
              <Stat label="Solves" value={String(stats.solves)} />
            </div>
            {pendingTimerStart && <div className="mt-2 text-xs text-white/60">הטיימר יתחיל אחרי המהלך הראשון.</div>}
          </div>

          <MovePad />

          {status.kind !== "idle" && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                status.kind === "error" ? "bg-red-500/20" : status.kind === "loading" ? "bg-white/10" : "bg-white/5"
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

function Stat(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-2 py-2">
      <div className="text-[11px] uppercase tracking-wide text-white/60">{props.label}</div>
      <div className="mt-1 font-mono text-sm">{props.value}</div>
    </div>
  );
}
