import type { Alg, Face, Move, TurnAmount } from "./types";

const FACE_SET = new Set<Face>(["U", "R", "F", "D", "L", "B"]);

export function moveToToken(move: Move): string {
  if (move.amount === 1) return move.face;
  if (move.amount === -1) return `${move.face}'`;
  return `${move.face}2`;
}

export function tokenToMove(token: string): Move {
  const trimmed = token.trim();
  if (!trimmed) throw new Error("Empty move token");

  const face = trimmed[0]?.toUpperCase() as Face;
  if (!FACE_SET.has(face)) throw new Error(`Invalid face: ${trimmed}`);

  const suffix = trimmed.slice(1);
  let amount: TurnAmount = 1;
  if (suffix === "'") amount = -1;
  else if (suffix === "2") amount = 2;
  else if (suffix.length > 0) throw new Error(`Invalid move suffix: ${trimmed}`);

  return { face, amount };
}

export function parseAlg(text: string): Alg {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return [];
  return normalized.split(" ").map(tokenToMove);
}

export function formatMoves(moves: Alg): string {
  return moves.map(moveToToken).join(" ");
}

export function invertMove(move: Move): Move {
  if (move.amount === 2) return move;
  return { face: move.face, amount: (move.amount === 1 ? -1 : 1) as TurnAmount };
}

export function invertAlg(moves: Alg): Alg {
  return [...moves].reverse().map(invertMove);
}

