import { describe, expect, it } from "vitest";
import Cube from "cubejs";
import { getNextBeginnerHint } from "./beginnerSolver";
import { formatMoves } from "../../cube/notation";

const SCRAMBLES = [
  "R U R' U' F2 D L2",
  "F R U R' U' F' U2",
  "L U2 L' U' R U R'",
  "B U B' U' R2 D2",
  "F' L' U' L U F",
  "R2 U2 F2 U2 L2",
  "U R U' L' U R' U' L",
  "D R U R' D' U2",
  "F U R U' R' F'",
  "L' U' L U F U F'",
];

describe("beginner solver", () => {
  it("progresses to solved on multiple scrambles", () => {
    for (const scramble of SCRAMBLES) {
      const cube = new Cube();
      cube.move(scramble);

      for (let i = 0; i < 400 && !cube.isSolved(); i++) {
        const hint = getNextBeginnerHint(cube);
        if (hint.moves.length === 0) break;
        cube.move(formatMoves(hint.moves));
      }

      if (!cube.isSolved()) {
        throw new Error(`Beginner solver failed on scramble: ${scramble}\nState: ${cube.asString()}`);
      }
    }
  });
});
