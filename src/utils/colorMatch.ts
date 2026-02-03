import type { StickerColor } from "../cube/validation";

export type RGB = { r: number; g: number; b: number };

type HSL = { h: number; s: number; l: number };

export type CalibrationMap = Partial<Record<StickerColor, RGB>>;

const ALL_COLORS: StickerColor[] = ["white", "yellow", "green", "blue", "red", "orange"];

export function matchStickerColor(rgb: RGB, calibration?: CalibrationMap): StickerColor {
  if (calibration && hasFullCalibration(calibration)) {
    return matchWithCalibration(rgb, calibration);
  }
  return matchWithHeuristics(rgb);
}

function matchWithHeuristics(rgb: RGB): StickerColor {
  const rn = rgb.r / 255;
  const gn = rgb.g / 255;
  const bn = rgb.b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  if (l > 0.72 && chroma < 0.18) return "white";
  if (inRange(h, 40, 75) && s > 0.25 && l > 0.35) return "yellow";
  if (inRange(h, 80, 160)) return "green";
  if (inRange(h, 180, 260)) return "blue";
  if (inRange(h, 15, 40)) return "orange";
  return "red";
}

function matchWithCalibration(rgb: RGB, calibration: CalibrationMap): StickerColor {
  const target = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let best: StickerColor = "white";
  let bestScore = Infinity;

  for (const color of ALL_COLORS) {
    const ref = calibration[color];
    if (!ref) continue;
    const refHsl = rgbToHsl(ref.r, ref.g, ref.b);
    const score = hslDistance(target, refHsl);
    if (score < bestScore) {
      bestScore = score;
      best = color;
    }
  }
  return best;
}

function hasFullCalibration(calibration: CalibrationMap): calibration is Record<StickerColor, RGB> {
  return ALL_COLORS.every((c) => Boolean(calibration[c]));
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
  }
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

function inRange(h: number, start: number, end: number): boolean {
  const hh = (h + 360) % 360;
  if (start <= end) return hh >= start && hh <= end;
  return hh >= start || hh <= end;
}

function hslDistance(a: HSL, b: HSL): number {
  const hueWeight = a.s < 0.2 || b.s < 0.2 ? 0.1 : 0.6;
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 180;
  const ds = Math.abs(a.s - b.s);
  const dl = Math.abs(a.l - b.l);
  return dh * hueWeight + ds * 0.8 + dl * 1.2;
}
