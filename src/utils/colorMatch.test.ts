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

  it("prefers calibrated colors when provided", () => {
    const calibration = {
      white: { r: 225, g: 230, b: 235 },
      yellow: { r: 250, g: 215, b: 70 },
      green: { r: 40, g: 180, b: 90 },
      blue: { r: 70, g: 120, b: 230 },
      red: { r: 230, g: 60, b: 60 },
      orange: { r: 240, g: 150, b: 60 },
    };
    const nearWhite = { r: 210, g: 220, b: 230 };
    expect(matchStickerColor(nearWhite, calibration)).toBe("white");
  });
});
