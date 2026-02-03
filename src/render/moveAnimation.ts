import * as THREE from "three";
import type { Face, Move } from "../cube/types";

export type Axis = "x" | "y" | "z";

export function axisForFace(face: Face): Axis {
  if (face === "U" || face === "D") return "y";
  if (face === "R" || face === "L") return "x";
  return "z";
}

export function axisDirForFace(face: Face): THREE.Vector3 {
  switch (face) {
    case "R":
      return new THREE.Vector3(1, 0, 0);
    case "L":
      return new THREE.Vector3(-1, 0, 0);
    case "U":
      return new THREE.Vector3(0, 1, 0);
    case "D":
      return new THREE.Vector3(0, -1, 0);
    case "F":
      return new THREE.Vector3(0, 0, 1);
    case "B":
      return new THREE.Vector3(0, 0, -1);
  }
}

export function layerSelector(face: Face, pos: THREE.Vector3): boolean {
  const eps = 0.25;
  switch (face) {
    case "R":
      return pos.x > 1 - eps;
    case "L":
      return pos.x < -1 + eps;
    case "U":
      return pos.y > 1 - eps;
    case "D":
      return pos.y < -1 + eps;
    case "F":
      return pos.z > 1 - eps;
    case "B":
      return pos.z < -1 + eps;
  }
}

export function radiansForMove(move: Move): number {
  const quarter = (Math.PI / 2) * move.amount;
  // Clockwise when looking at the face from outside.
  return -quarter;
}

export function quantizeVec3(v: THREE.Vector3): THREE.Vector3 {
  v.set(Math.round(v.x), Math.round(v.y), Math.round(v.z));
  return v;
}
