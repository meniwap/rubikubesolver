import type { Face } from "../cube/types";

export type StickerFaces = Array<Face | null>;

export function cubeletStickerFaces(x: number, y: number, z: number): StickerFaces {
  // BoxGeometry material order: [right, left, top, bottom, front, back]
  return [x === 1 ? "R" : null, x === -1 ? "L" : null, y === 1 ? "U" : null, y === -1 ? "D" : null, z === 1 ? "F" : null, z === -1 ? "B" : null];
}
