import { describe, expect, it } from "vitest";
import { matchStickerColor } from "./colorMatch";

const samples: Array<{ rgb: { r: number; g: number; b: number }; expected: string }> = [
  { rgb: { r: 241, g: 245, b: 255 }, expected: "white" },
  { rgb: { r: 255, g: 216, b: 77 }, expected: "yellow" },
  { rgb: { r: 45, g: 211, b: 111 }, expected: "green" },
  { rgb: { r: 76, g: 141, b: 255 }, expected: "blue" },
  { rgb: { r: 255, g: 59, b: 59 }, expected: "red" },
  { rgb: { r: 255, g: 159, b: 59 }, expected: "orange" },
];

describe("colorMatch", () => {
  it("matches primary sticker colors", () => {
    for (const sample of samples) {
      expect(matchStickerColor(sample.rgb)).toBe(sample.expected);
    }
  });
});
