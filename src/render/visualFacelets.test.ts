import { describe, expect, it } from "vitest";
import * as THREE from "three";
import Cube from "cubejs";
import type { Move } from "../cube/types";
import { moveToToken } from "../cube/notation";
import { cubeletStickerFaces } from "./cubeletData";
import { computeVisualFacelets } from "./visualFacelets";
import { axisDirForFace, layerSelector, quantizeVec3, radiansForMove } from "./moveAnimation";

function buildCube() {
  const root = new THREE.Group();
  const cubelets: THREE.Mesh[] = [];
  for (const x of [-1, 0, 1] as const) {
    for (const y of [-1, 0, 1] as const) {
      for (const z of [-1, 0, 1] as const) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        mesh.position.set(x, y, z);
        mesh.userData = { stickerFaces: cubeletStickerFaces(x, y, z) };
        root.add(mesh);
        cubelets.push(mesh);
      }
    }
  }
  return { root, cubelets };
}

function applyMove(root: THREE.Group, cubelets: THREE.Mesh[], move: Move) {
  const axis = axisDirForFace(move.face).clone().normalize();
  const angle = radiansForMove(move);
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  for (const mesh of cubelets) {
    if (!layerSelector(move.face, mesh.position)) continue;
    mesh.position.applyQuaternion(q);
    mesh.quaternion.premultiply(q);
    quantizeVec3(mesh.position);
  }
  root.updateWorldMatrix(true, true);
}

describe("visualFacelets", () => {
  it("matches solved cube", () => {
    const { root, cubelets } = buildCube();
    const facelets = computeVisualFacelets(root, cubelets);
    expect(facelets).toBe(new Cube().asString());
  });

  it("matches cubejs after single turns", () => {
    const moves: Move[] = [
      { face: "U", amount: 1 },
      { face: "R", amount: 1 },
      { face: "F", amount: 1 },
      { face: "D", amount: -1 },
      { face: "L", amount: -1 },
      { face: "B", amount: 2 },
    ];

    for (const move of moves) {
      const { root, cubelets } = buildCube();
      applyMove(root, cubelets, move);
      const visual = computeVisualFacelets(root, cubelets);
      const cube = new Cube();
      cube.move(moveToToken(move));
      expect(visual).toBe(cube.asString());
    }
  });

  it("matches cubejs after multiple moves", () => {
    const { root, cubelets } = buildCube();
    const seq: Move[] = [
      { face: "R", amount: 1 },
      { face: "U", amount: 1 },
      { face: "F", amount: -1 },
      { face: "L", amount: 2 },
    ];
    const cube = new Cube();
    for (const move of seq) {
      applyMove(root, cubelets, move);
      cube.move(moveToToken(move));
    }
    const visual = computeVisualFacelets(root, cubelets);
    expect(visual).toBe(cube.asString());
  });
});
