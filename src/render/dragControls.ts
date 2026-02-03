import * as THREE from "three";
import type { Face, Move } from "../cube/types";

export function faceFromWorldNormal(normal: THREE.Vector3): Face {
  const n = normal.clone().normalize();
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ax >= ay && ax >= az) return n.x >= 0 ? "R" : "L";
  if (ay >= ax && ay >= az) return n.y >= 0 ? "U" : "D";
  return n.z >= 0 ? "F" : "B";
}

export function moveFromDrag(opts: {
  face: Face;
  camera: THREE.Camera;
  dx: number;
  dy: number;
}): Move | null {
  const { face, camera, dx, dy } = opts;
  const dist = Math.hypot(dx, dy);
  if (dist < 12) return null;

  // Convert screen drag into a world direction on the camera plane.
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const up = camera.up.clone().normalize();

  const worldDrag = right.multiplyScalar(dx).add(up.multiplyScalar(-dy)).normalize();

  // Face-local right/up vectors (in world coordinates) for direction decisions.
  const faceRightUp = faceBasis(face);
  const h = worldDrag.dot(faceRightUp.right);
  const v = worldDrag.dot(faceRightUp.up);

  const horizontal = Math.abs(h) >= Math.abs(v);
  const dir = horizontal ? Math.sign(h) : Math.sign(v);
  if (dir === 0) return null;

  const amount = dragToAmount(face, horizontal ? "h" : "v", dir);
  return { face, amount };
}

function faceBasis(face: Face): { right: THREE.Vector3; up: THREE.Vector3 } {
  // World axes: +x=R, +y=U, +z=F
  switch (face) {
    case "F":
      return { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) };
    case "B":
      return { right: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) };
    case "R":
      return { right: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) };
    case "L":
      return { right: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) };
    case "U":
      return { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, -1) };
    case "D":
      return { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, 1) };
  }
}

function dragToAmount(face: Face, axis: "h" | "v", dir: number): 1 | -1 | 2 {
  // Heuristic mapping: consistent > "physically perfect".
  // dir: +1 means along the face-basis right/up vectors.
  if (axis === "h") {
    // Horizontal drags
    if (face === "U") return dir > 0 ? 1 : -1;
    if (face === "D") return dir > 0 ? -1 : 1;
    if (face === "F") return dir > 0 ? 1 : -1;
    if (face === "B") return dir > 0 ? -1 : 1;
    if (face === "R") return dir > 0 ? -1 : 1;
    if (face === "L") return dir > 0 ? 1 : -1;
  } else {
    // Vertical drags
    if (face === "F") return dir > 0 ? -1 : 1;
    if (face === "B") return dir > 0 ? 1 : -1;
    if (face === "R") return dir > 0 ? -1 : 1;
    if (face === "L") return dir > 0 ? 1 : -1;
    if (face === "U") return dir > 0 ? 1 : -1;
  if (face === "D") return dir > 0 ? -1 : 1;
  }
  return 1;
}
