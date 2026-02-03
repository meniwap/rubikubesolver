import type { Face, Move } from "../../cube/types";

const CYCLE: Face[] = ["F", "R", "B", "L"];

export function rotateFaceY(face: Face, turns: number): Face {
  const t = ((turns % 4) + 4) % 4;
  if (face === "U" || face === "D") return face;
  const idx = CYCLE.indexOf(face);
  if (idx === -1) return face;
  return CYCLE[(idx + t) % 4]!;
}

export function yRotateMove(move: Move, turns: number): Move {
  return { face: rotateFaceY(move.face, turns), amount: move.amount };
}

export function yRotateAlg(moves: Move[], turns: number): Move[] {
  if (turns % 4 === 0) return moves;
  return moves.map((m) => yRotateMove(m, turns));
}

