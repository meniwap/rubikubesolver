import { describe, expect, it } from "vitest";
import Cube from "cubejs";
import { FACE_TO_COLOR, isSolvable, toURFDLBFacelets, validateFaceletColors, type StickerColor } from "./validation";

function solvedColors(): StickerColor[] {
  const faces = ["U", "R", "F", "D", "L", "B"] as const;
  const out: StickerColor[] = [];
  for (const f of faces) {
    for (let i = 0; i < 9; i++) out.push(FACE_TO_COLOR[f]);
  }
  return out;
}

describe("validation", () => {
  it("accepts solved colors and converts to facelets", () => {
    const colors = solvedColors();
    const v = validateFaceletColors(colors);
    expect(v.ok).toBe(true);
    const facelets = toURFDLBFacelets(colors);
    expect(facelets).toHaveLength(54);
    expect(facelets).toBe(new Cube().asString());
  });

  it("rejects wrong color counts", () => {
    const colors = solvedColors();
    colors[0] = "red";
    const v = validateFaceletColors(colors);
    expect(v.ok).toBe(false);
  });

  it("rejects duplicated centers", () => {
    const colors = solvedColors();
    colors[4] = colors[13]!; // U center same as R center
    const v = validateFaceletColors(colors);
    expect(v.ok).toBe(false);
  });

  it("maps colors using centers (preserves orientation)", () => {
    const colors = solvedColors();
    // Swap U and D faces' colors (orientation preserved via centers).
    for (let i = 0; i < 9; i++) {
      const uIdx = i;
      const dIdx = 27 + i;
      const tmp = colors[uIdx]!;
      colors[uIdx] = colors[dIdx]!;
      colors[dIdx] = tmp;
    }
    const v = validateFaceletColors(colors);
    expect(v.ok).toBe(true);
    const facelets = toURFDLBFacelets(colors);
    expect(facelets).toBe(new Cube().asString());
  });

  it("rejects unsolvable parity (swap two edges)", () => {
    const c = new Cube();
    // Swap two edges in the cube state (illegal in real cube).
    const tmp = c.ep[0]!;
    c.ep[0] = c.ep[1]!;
    c.ep[1] = tmp;
    const facelets = c.asString();
    const solvable = isSolvable(facelets);
    expect(solvable.ok).toBe(false);
  });
});
