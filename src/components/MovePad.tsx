import type { Face, Move, TurnAmount } from "../cube/types";
import { moveToToken } from "../cube/notation";
import { useGameStore } from "../state/gameStore";

const FACE_ORDER: Face[] = ["U", "R", "F", "D", "L", "B"];

export function MovePad(props: { compact?: boolean }) {
  const enqueueMoves = useGameStore((s) => s.enqueueMoves);
  const disabled = useGameStore((s) => s.isAnimating);

  const amounts: TurnAmount[] = [1, -1, 2];
  return (
    <div className={`grid gap-2 ${props.compact ? "grid-cols-6" : "grid-cols-3"}`}>
      {FACE_ORDER.flatMap((face) =>
        amounts.map((amount) => {
          const move: Move = { face, amount };
          return (
            <button
              key={`${face}${amount}`}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
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

function tokenHelp(face: Face): string {
  switch (face) {
    case "U":
      return "Up";
    case "D":
      return "Down";
    case "R":
      return "Right";
    case "L":
      return "Left";
    case "F":
      return "Front";
    case "B":
      return "Back";
  }
}
