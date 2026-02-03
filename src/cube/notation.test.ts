import { describe, expect, it } from "vitest";
import { formatMoves, parseAlg, tokenToMove } from "./notation";

describe("notation", () => {
  it("parses basic moves", () => {
    expect(parseAlg("R U R' U2")).toEqual([
      { face: "R", amount: 1 },
      { face: "U", amount: 1 },
      { face: "R", amount: -1 },
      { face: "U", amount: 2 },
    ]);
  });

  it("formats moves", () => {
    const moves = parseAlg("R  U   R'   U2");
    expect(formatMoves(moves)).toBe("R U R' U2");
  });

  it("rejects invalid token", () => {
    expect(() => tokenToMove("Q")).toThrow();
    expect(() => tokenToMove("R3")).toThrow();
  });
});

