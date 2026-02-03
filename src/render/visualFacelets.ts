import * as THREE from "three";
import type { Face } from "../cube/types";
import type { StickerFaces } from "./cubeletData";

const FACE_OFFSETS: Record<Face, number> = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
const LOCAL_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

let provider: (() => string | null) | null = null;

export function registerVisualFaceletsProvider(next: () => string | null) {
  provider = next;
  if (typeof window !== "undefined" && (import.meta.env.DEV || import.meta.env.MODE === "test")) {
    window.__get_visual_facelets = next;
  }
}

export function getVisualFacelets(): string | null {
  return provider ? provider() : null;
}

export function computeVisualFacelets(root: THREE.Object3D | null, cubelets: THREE.Mesh[]): string | null {
  if (!root) return null;
  root.updateWorldMatrix(true, true);

  const facelets = new Array<string>(54).fill("?");
  const pos = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  let invalid = false;

  for (const mesh of cubelets) {
    const stickerFaces = mesh.userData?.stickerFaces as StickerFaces | undefined;
    if (!stickerFaces || stickerFaces.length !== 6) continue;

    mesh.getWorldPosition(pos);
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    const z = Math.round(pos.z);

    mesh.getWorldQuaternion(quat);

    for (let i = 0; i < 6; i++) {
      const sticker = stickerFaces[i];
      if (!sticker) continue;
      normal.copy(LOCAL_NORMALS[i]).applyQuaternion(quat).normalize();
      const face = faceFromNormal(normal);
      const idx = faceletIndex(face, x, y, z);
      if (idx === null) {
        invalid = true;
        continue;
      }
      if (facelets[idx] !== "?" && facelets[idx] !== sticker) {
        invalid = true;
      }
      facelets[idx] = sticker;
    }
  }

  if (invalid || facelets.some((f) => f === "?")) return null;
  return facelets.join("");
}

function faceFromNormal(n: THREE.Vector3): Face {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ax >= ay && ax >= az) return n.x >= 0 ? "R" : "L";
  if (ay >= ax && ay >= az) return n.y >= 0 ? "U" : "D";
  return n.z >= 0 ? "F" : "B";
}

function faceletIndex(face: Face, x: number, y: number, z: number): number | null {
  const offset = FACE_OFFSETS[face];
  if (offset == null) return null;
  let row = 0;
  let col = 0;
  switch (face) {
    case "U":
      row = z + 1;
      col = x + 1;
      break;
    case "D":
      row = 1 - z;
      col = x + 1;
      break;
    case "F":
      row = 1 - y;
      col = x + 1;
      break;
    case "B":
      row = 1 - y;
      col = 1 - x;
      break;
    case "R":
      row = 1 - y;
      col = 1 - z;
      break;
    case "L":
      row = 1 - y;
      col = z + 1;
      break;
  }
  if (row < 0 || row > 2 || col < 0 || col > 2) return null;
  return offset + row * 3 + col;
}
