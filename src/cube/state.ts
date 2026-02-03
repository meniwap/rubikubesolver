import Cube from "cubejs";
import type { Alg, Move } from "./types";
import { formatMoves, moveToToken } from "./notation";
import { fromFaceletsStrict } from "./validation";

export type CubeState = Cube;

export function createCubeFromFacelets(faceletsURFDLB: string): CubeState {
  const strict = fromFaceletsStrict(faceletsURFDLB);
  if (!strict.ok) {
    throw new Error(`Invalid cube state: ${strict.errors.join("; ")}`);
  }
  return Cube.fromString(faceletsURFDLB);
}

export function applyMove(cube: CubeState, move: Move): CubeState {
  cube.move(moveToToken(move));
  return cube;
}

export function applyAlg(cube: CubeState, moves: Alg): CubeState {
  if (moves.length === 0) return cube;
  cube.move(formatMoves(moves));
  return cube;
}

export function getFacelets(cube: CubeState): string {
  return cube.asString();
}

