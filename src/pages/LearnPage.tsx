import { useEffect } from "react";
import { CubeViewport } from "../components/CubeViewport";
import { MovePad } from "../components/MovePad";
import { moveToToken } from "../cube/notation";
import { useGameStore } from "../state/gameStore";

export function LearnPage() {
  const requestHint = useGameStore((s) => s.requestHint);
  const requestSolveBeginner = useGameStore((s) => s.requestSolveBeginner);
  const enqueueMoves = useGameStore((s) => s.enqueueMoves);
  const hint = useGameStore((s) => s.hint);
  const status = useGameStore((s) => s.status);
  const isAnimating = useGameStore((s) => s.isAnimating);

  useEffect(() => {
    // Auto-load a hint panel when entering Learn.
    requestHint().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Learn (שיטת מתחילים)</h1>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CubeViewport className="h-[360px] w-full rounded-xl bg-white/5 lg:h-[520px]" />

        <div className="flex flex-col gap-3">
          {hint && (
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-sm font-bold">{hint.title}</div>
              <div className="mt-1 text-xs text-white/70">{hint.explanation}</div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="rounded-lg bg-white/10 px-3 py-1 font-mono text-sm">
                  {hint.moves[0] ? moveToToken(hint.moves[0]) : "—"}
                </div>
                <button
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
                  disabled={isAnimating || hint.moves.length === 0}
                  onClick={() => enqueueMoves(hint.moves.slice(0, 1), { recordHistory: true, source: "user" })}
                >
                  בצע מהלך
                </button>
              </div>
            </div>
          )}

          <MovePad compact />

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
