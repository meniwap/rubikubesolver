import type { Alg, Face, Move, TurnAmount } from "./types";

const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
const AMOUNTS: TurnAmount[] = [1, -1, 2];

export function generateFallbackScramble(minMoves = 20, maxMoves = 25, rng: () => number = Math.random): Alg {
  const length = randomInt(minMoves, maxMoves, rng);
  const moves: Move[] = [];
  let lastFace: Face | null = null;

  for (let i = 0; i < length; i++) {
    let face = pickFace(rng);
    while (face === lastFace) face = pickFace(rng);
    lastFace = face;
    const amount = AMOUNTS[Math.floor(rng() * AMOUNTS.length)]!;
    moves.push({ face, amount });
  }

  return moves;
}

function pickFace(rng: () => number): Face {
  return FACES[Math.floor(rng() * FACES.length)]!;
}

function randomInt(min: number, max: number, rng: () => number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(rng() * (high - low + 1)) + low;
}
