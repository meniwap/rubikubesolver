import type { Face, Move, TurnAmount } from "../cube/types";
import { moveToToken } from "../cube/notation";
import { useGameStore } from "../state/gameStore";

const FACE_ORDER: Face[] = ["U", "R", "F", "D", "L", "B"];

// Color mappings for each face
const FACE_COLORS: Record<Face, { bg: string; hover: string; text: string; border: string }> = {
  U: {
    bg: "bg-gradient-to-br from-white/20 to-gray-100/10",
    hover: "hover:from-white/30 hover:to-gray-100/20",
    text: "text-gray-100",
    border: "border-gray-200/30",
  },
  R: {
    bg: "bg-gradient-to-br from-red-500/20 to-red-600/10",
    hover: "hover:from-red-500/30 hover:to-red-600/20",
    text: "text-red-200",
    border: "border-red-400/30",
  },
  F: {
    bg: "bg-gradient-to-br from-green-500/20 to-green-600/10",
    hover: "hover:from-green-500/30 hover:to-green-600/20",
    text: "text-green-200",
    border: "border-green-400/30",
  },
  D: {
    bg: "bg-gradient-to-br from-yellow-400/20 to-yellow-500/10",
    hover: "hover:from-yellow-400/30 hover:to-yellow-500/20",
    text: "text-yellow-200",
    border: "border-yellow-400/30",
  },
  L: {
    bg: "bg-gradient-to-br from-orange-500/20 to-orange-600/10",
    hover: "hover:from-orange-500/30 hover:to-orange-600/20",
    text: "text-orange-200",
    border: "border-orange-400/30",
  },
  B: {
    bg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
    hover: "hover:from-blue-500/30 hover:to-blue-600/20",
    text: "text-blue-200",
    border: "border-blue-400/30",
  },
};

export function MovePad(props: { compact?: boolean }) {
  const enqueueMoves = useGameStore((s) => s.enqueueMoves);
  const disabled = useGameStore((s) => s.isAnimating);

  const amounts: TurnAmount[] = [1, -1, 2];

  if (props.compact) {
    return (
      <div className="grid grid-cols-6 gap-1.5">
        {FACE_ORDER.flatMap((face) =>
          amounts.map((amount) => {
            const move: Move = { face, amount };
            const colors = FACE_COLORS[face];
            return (
              <button
                key={`${face}${amount}`}
                className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 ${colors.bg} ${colors.hover} ${colors.text} ${colors.border}`}
                disabled={disabled}
                onClick={() => enqueueMoves([move], { recordHistory: true, source: "user" })}
                title={tokenHelp(face)}
              >
                {moveToToken(move)}
              </button>
            );
          }),
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">
        מהלכים
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {FACE_ORDER.map((face) => (
          <div key={face} className="flex flex-col gap-1.5">
            <div className="text-center text-[10px] font-medium uppercase tracking-wide text-white/40">
              {face}
            </div>
            {amounts.map((amount) => {
              const move: Move = { face, amount };
              const colors = FACE_COLORS[face];
              return (
                <button
                  key={`${face}${amount}`}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${colors.bg} ${colors.hover} ${colors.text} ${colors.border}`}
                  disabled={disabled}
                  onClick={() => enqueueMoves([move], { recordHistory: true, source: "user" })}
                  title={tokenHelp(face)}
                >
                  {moveToToken(move)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function tokenHelp(face: Face): string {
  switch (face) {
    case "U":
      return "Up (למעלה)";
    case "D":
      return "Down (למטה)";
    case "R":
      return "Right (ימין)";
    case "L":
      return "Left (שמאל)";
    case "F":
      return "Front (קדימה)";
    case "B":
      return "Back (אחורה)";
  }
}
