import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Face, Move } from "../cube/types";
import type { StickerColor } from "../cube/validation";
import { useGameStore } from "../state/gameStore";
import { faceFromWorldNormal, moveFromDrag } from "./dragControls";
import { axisDirForFace, layerSelector, quantizeVec3, radiansForMove } from "./moveAnimation";
import { cubeletStickerFaces } from "./cubeletData";
import { computeVisualFacelets, registerVisualFaceletsProvider } from "./visualFacelets";

type CubeletSpec = { id: string; pos: [number, number, number] };

const BODY_COLOR = "#0b0f1f";

export function CubeScene() {
  const rootRef = useRef<THREE.Group>(null);
  const sliceRef = useRef<THREE.Group>(null);
  const cubeletRefs = useRef<Record<string, THREE.Mesh>>(Object.create(null));

  const visualResetKey = useGameStore((s) => s.visualResetKey);
  const current = useGameStore((s) => s.current);
  const isAnimating = useGameStore((s) => s.isAnimating);
  const animationMs = useGameStore((s) => s.settings.animationMs);
  const startNextMove = useGameStore((s) => s.startNextMove);
  const finishCurrentMove = useGameStore((s) => s.finishCurrentMove);
  const enqueueMoves = useGameStore((s) => s.enqueueMoves);
  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const facelets = useGameStore((s) => s.facelets);
  const faceColors = useGameStore((s) => s.faceColors);

  const { camera } = useThree();
  const debug = import.meta.env.DEV || import.meta.env.MODE === "test";
  const lastMismatch = useRef<boolean>(false);
  const lastCheckAt = useRef<number>(0);

  const cubelets = useMemo<CubeletSpec[]>(() => {
    const out: CubeletSpec[] = [];
    for (const x of [-1, 0, 1] as const) {
      for (const y of [-1, 0, 1] as const) {
        for (const z of [-1, 0, 1] as const) {
          out.push({ id: `${x},${y},${z}`, pos: [x, y, z] });
        }
      }
    }
    return out;
  }, []);

  useEffect(() => {
    // Reset all cubelets to solved state.
    const root = rootRef.current;
    if (!root) return;
    for (const spec of cubelets) {
      const mesh = cubeletRefs.current[spec.id];
      if (!mesh) continue;
      mesh.position.set(...spec.pos);
      mesh.rotation.set(0, 0, 0);
      mesh.quaternion.identity();
      root.attach(mesh);
    }
    if (sliceRef.current) {
      sliceRef.current.rotation.set(0, 0, 0);
      sliceRef.current.quaternion.identity();
    }
  }, [visualResetKey, cubelets]);

  useEffect(() => {
    const provider = () => computeVisualFacelets(rootRef.current, Object.values(cubeletRefs.current));
    registerVisualFaceletsProvider(provider);
  }, []);

  // Start next queued move when ready.
  useEffect(() => {
    if (!isAnimating && !current) startNextMove();
  }, [isAnimating, current, startNextMove]);

  const [drag, setDrag] = useState<{ face: Face; x: number; y: number } | null>(null);

  // Animation loop: rotate active slice, then commit.
  const animRef = useRef<{
    move: Move;
    startTs: number;
    targetRad: number;
    axis: THREE.Vector3;
    affectedIds: string[];
  } | null>(null);

  useEffect(() => {
    if (!current || !isAnimating) return;
    const root = rootRef.current;
    const slice = sliceRef.current;
    if (!root || !slice) return;

    const move = current.move;
    const axis = axisDirForFace(move.face);
    const targetRad = radiansForMove(move);

    const affected: string[] = [];
    for (const spec of cubelets) {
      const mesh = cubeletRefs.current[spec.id];
      if (!mesh) continue;
      if (layerSelector(move.face, mesh.position)) {
        affected.push(spec.id);
        slice.attach(mesh);
      }
    }

    slice.rotation.set(0, 0, 0);
    slice.quaternion.identity();
    animRef.current = { move, startTs: performance.now(), targetRad, axis, affectedIds: affected };
  }, [cubelets, current, isAnimating]);

  useFrame(() => {
    const anim = animRef.current;
    if (!anim) return;
    const slice = sliceRef.current;
    const root = rootRef.current;
    if (!slice || !root) return;

    const elapsed = performance.now() - anim.startTs;
    const t = clamp(elapsed / animationMs, 0, 1);
    const eased = easeInOutCubic(t);
    const angle = anim.targetRad * eased;

    slice.setRotationFromAxisAngle(anim.axis, angle);

    if (t >= 1) {
      // Commit: detach cubelets back to root and quantize.
      slice.setRotationFromAxisAngle(anim.axis, anim.targetRad);
      for (const id of anim.affectedIds) {
        const mesh = cubeletRefs.current[id];
        if (!mesh) continue;
        root.attach(mesh);
        quantizeVec3(mesh.position);
        mesh.rotation.setFromQuaternion(mesh.quaternion);
      }
      slice.rotation.set(0, 0, 0);
      slice.quaternion.identity();
      animRef.current = null;
      finishCurrentMove();
    }
  });

  useFrame(() => {
    if (!debug) return;
    if (isAnimating) return;
    const now = performance.now();
    if (now - lastCheckAt.current < 200) return;
    lastCheckAt.current = now;
    const visual = computeVisualFacelets(rootRef.current, Object.values(cubeletRefs.current));
    const mismatch = !visual || visual !== facelets;
    if (mismatch && !lastMismatch.current && (status.kind === "idle" || status.kind === "info")) {
      setStatus({ kind: "info", message: "אזהרה: סטייט ויזואלי לא תואם לסטייט הלוגי." });
    }
    lastMismatch.current = mismatch;
  });

  return (
    <>
      <group ref={rootRef}>
        <group ref={sliceRef} />
        {cubelets.map((c) => (
          <Cubelet
            key={c.id}
            id={c.id}
            position={c.pos}
            faceColors={faceColors}
            meshRef={(m) => {
              if (m) cubeletRefs.current[c.id] = m;
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!e.face) return;
              const normal = e.face.normal.clone().transformDirection(e.object.matrixWorld);
              const face = faceFromWorldNormal(normal);
              setDrag({ face, x: e.clientX, y: e.clientY });
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (!drag) return;
              const move = moveFromDrag({ face: drag.face, camera, dx: e.clientX - drag.x, dy: e.clientY - drag.y });
              setDrag(null);
              if (!move) return;
              enqueueMoves([move], { recordHistory: true, source: "user" });
            }}
          />
        ))}
      </group>

      <OrbitControls enablePan={false} makeDefault />
    </>
  );
}

function Cubelet(props: {
  id: string;
  position: [number, number, number];
  faceColors: Record<Face, StickerColor>;
  meshRef: (m: THREE.Mesh | null) => void;
  onPointerDown: (e: any) => void;
  onPointerUp: (e: any) => void;
}) {
  const { position } = props;
  const [x, y, z] = position;
  const materials = useMemo(() => makeCubeletMaterials(x, y, z, props.faceColors), [x, y, z, props.faceColors]);
  const stickerFaces = useMemo(() => cubeletStickerFaces(x, y, z), [x, y, z]);

  return (
    <mesh
      ref={props.meshRef}
      position={position}
      onPointerDown={props.onPointerDown}
      onPointerUp={props.onPointerUp}
      userData={{ stickerFaces }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.98, 0.98, 0.98]} />
      {materials.map((m, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={m} />
      ))}
    </mesh>
  );
}

function makeCubeletMaterials(x: number, y: number, z: number, faceColors: Record<Face, StickerColor>): string[] {
  // BoxGeometry material order: [right, left, top, bottom, front, back]
  const right = x === 1 ? colorHex(faceColors.R) : BODY_COLOR;
  const left = x === -1 ? colorHex(faceColors.L) : BODY_COLOR;
  const top = y === 1 ? colorHex(faceColors.U) : BODY_COLOR;
  const bottom = y === -1 ? colorHex(faceColors.D) : BODY_COLOR;
  const front = z === 1 ? colorHex(faceColors.F) : BODY_COLOR;
  const back = z === -1 ? colorHex(faceColors.B) : BODY_COLOR;
  return [right, left, top, bottom, front, back];
}

function colorHex(c: string): string {
  switch (c) {
    case "white":
      return "#f1f5ff";
    case "yellow":
      return "#ffd84d";
    case "green":
      return "#2dd36f";
    case "blue":
      return "#4c8dff";
    case "red":
      return "#ff3b3b";
    case "orange":
      return "#ff9f3b";
    default:
      return c;
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
