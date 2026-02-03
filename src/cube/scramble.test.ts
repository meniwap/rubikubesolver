import { describe, expect, it } from "vitest";
import { generateFallbackScramble } from "./scramble";

function makeRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("fallback scramble", () => {
  it("creates a valid-length scramble without repeated faces", () => {
    const rng = makeRng(42);
    const moves = generateFallbackScramble(20, 25, rng);
    expect(moves.length).toBeGreaterThanOrEqual(20);
    expect(moves.length).toBeLessThanOrEqual(25);
    for (let i = 1; i < moves.length; i++) {
      expect(moves[i]?.face).not.toBe(moves[i - 1]?.face);
    }
  });
});
