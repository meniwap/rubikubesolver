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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="page-title">לימוד</h1>
          <span className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200">
            שיטת מתחילים
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-success flex items-center gap-2"
            disabled={isAnimating}
            onClick={() => requestHint()}
          >
            <HintIcon />
            רמז
          </button>
          <button
            className="btn-info flex items-center gap-2"
            disabled={isAnimating}
            onClick={requestSolveBeginner}
          >
            <SolveIcon />
            פתרו
          </button>
        </div>
      </div>

      {/* Intro Card */}
      <div className="glass-card p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-2">
            <BookIcon />
          </div>
          <div>
            <h2 className="font-bold">איך זה עובד?</h2>
            <p className="mt-1 text-sm text-white/60">
              לחץ על "רמז" כדי לקבל את המהלך הבא. בצע את המהלכים צעד אחר צעד ולמד את השיטה.
              השיטה מחולקת לשלבים - כל שלב מקרב אותך לפתרון!
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,380px] lg:gap-6">
        {/* Cube Viewport */}
        <CubeViewport className="glass-card h-[320px] w-full sm:h-[400px] lg:h-[520px]" />

        <div className="flex flex-col gap-4">
          {/* Hint Display */}
          {hint ? (
            <div className="hint-card animate-fade-in">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-purple-500/20 p-1.5">
                  <StageIcon />
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-purple-300">
                  שלב נוכחי
                </span>
              </div>
              <div className="text-lg font-bold text-white">{hint.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-white/60">{hint.explanation}</div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">המהלך הבא:</span>
                  <span className="glass-card px-4 py-2 font-mono text-lg font-bold text-white">
                    {hint.moves[0] ? moveToToken(hint.moves[0]) : "—"}
                  </span>
                </div>
                <button
                  className="btn-success flex items-center gap-2"
                  disabled={isAnimating || hint.moves.length === 0}
                  onClick={() => enqueueMoves(hint.moves.slice(0, 1), { recordHistory: true, source: "user" })}
                >
                  <PlayIcon />
                  בצע מהלך
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <div className="mb-3 inline-flex rounded-full bg-white/10 p-4">
                <LoadingIcon />
              </div>
              <div className="text-sm text-white/60">טוען רמז...</div>
            </div>
          )}

          {/* Move Pad */}
          <div className="glass-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">
              מהלכים ידניים
            </div>
            <MovePad compact />
          </div>

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

// Icons
function HintIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function SolveIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function StageIcon() {
  return (
    <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg className="h-6 w-6 animate-spin text-white/40" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
