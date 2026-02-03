import type { StickerColor } from "../cube/validation";

type RGB = { r: number; g: number; b: number };

type HSL = { h: number; s: number; l: number };

export function matchStickerColor(rgb: RGB): StickerColor {
  const rn = rgb.r / 255;
  const gn = rgb.g / 255;
  const bn = rgb.b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  if (max > 0.9 && chroma < 0.14) return "white";
  if (inRange(h, 40, 75) && s > 0.35 && l > 0.35) return "yellow";
  if (inRange(h, 80, 160)) return "green";
  if (inRange(h, 180, 260)) return "blue";
  if (inRange(h, 15, 40)) return "orange";
  return "red";
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
