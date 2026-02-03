import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import type { StickerColor } from "../cube/validation";
import type { Face } from "../cube/types";

const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
const FACE_OFFSET: Record<Face, number> = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

type Vec3 = [number, number, number];

type Basis = {
  normal: Vec3;
  right: Vec3;
  up: Vec3;
  rotation: Vec3;
};

const BASIS: Record<Face, Basis> = {
  F: { normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0], rotation: [0, 0, 0] },
  B: { normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0], rotation: [0, Math.PI, 0] },
  U: { normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1], rotation: [-Math.PI / 2, 0, 0] },
  D: { normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1], rotation: [Math.PI / 2, 0, 0] },
  R: { normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0], rotation: [0, Math.PI / 2, 0] },
  L: { normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0], rotation: [0, -Math.PI / 2, 0] },
};

const BODY_COLOR = "#0b0f1f";
const TILE = 0.72;
const GAP = 0.06;
const STEP = TILE + GAP;
const OFFSET = 1.52;

export function FaceletPreview(props: { colors: StickerColor[] }) {
  const facelets = useMemo(() => buildFacelets(props.colors), [props.colors]);

  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-sm font-bold">תצוגת קובייה (תלת־ממד)</div>
      <div className="mt-3 h-72 w-full overflow-hidden rounded-lg">
        <Canvas camera={{ position: [4.4, 3.4, 4.4], fov: 42 }} gl={{ antialias: true }}>
          <color attach="background" args={["#0b1020"]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[6, 10, 8]} intensity={1.2} />
          <group>
            <mesh>
              <boxGeometry args={[3, 3, 3]} />
              <meshStandardMaterial color={BODY_COLOR} />
            </mesh>
            {facelets.map((facelet, idx) => (
              <mesh key={idx} position={facelet.position} rotation={facelet.rotation}>
                <planeGeometry args={[TILE, TILE]} />
                <meshStandardMaterial color={facelet.color} />
              </mesh>
            ))}
          </group>
          <OrbitControls enablePan={false} minDistance={3.8} maxDistance={7.5} />
        </Canvas>
      </div>
      <div className="mt-2 text-xs text-white/60">אפשר לסובב עם העכבר/אצבע כדי לבדוק שכל הפאות נכונות.</div>
    </div>
  );
}

type FaceletRender = { position: Vec3; rotation: Vec3; color: string };

function buildFacelets(colors: StickerColor[]): FaceletRender[] {
  const out: FaceletRender[] = [];

  for (const face of FACES) {
    const basis = BASIS[face];
    const offset = FACE_OFFSET[face];
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const dx = (col - 1) * STEP;
      const dy = (1 - row) * STEP;
      const pos = addVec(addVec(scaleVec(basis.normal, OFFSET), scaleVec(basis.right, dx)), scaleVec(basis.up, dy));
      const color = colorHex(colors[offset + i] ?? "white");
      out.push({ position: pos, rotation: basis.rotation, color });
    }
  }

  return out;
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function colorHex(c: StickerColor | string): string {
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
      return String(c);
  }
}
