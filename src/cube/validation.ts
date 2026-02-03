import Cube from "cubejs";
import type { Face } from "./types";

export type StickerColor = "white" | "yellow" | "green" | "blue" | "red" | "orange";

export const STICKER_COLORS: StickerColor[] = ["white", "yellow", "green", "blue", "red", "orange"];

export const FACE_TO_COLOR: Record<Face, StickerColor> = {
  U: "white",
  R: "red",
  F: "green",
  D: "yellow",
  L: "orange",
  B: "blue",
};

const CENTER_FACELETS = [4, 13, 22, 31, 40, 49] as const;

export type ValidationResult = { ok: true; errors: [] } | { ok: false; errors: string[] };

export function validateFaceletColors(input54Colors: StickerColor[]): ValidationResult {
  const errors: string[] = [];
  if (input54Colors.length !== 54) errors.push("חייבים להזין בדיוק 54 מדבקות.");

  const counts = new Map<StickerColor, number>();
  for (const c of STICKER_COLORS) counts.set(c, 0);

  for (const c of input54Colors) {
    if (!STICKER_COLORS.includes(c)) {
      errors.push("נמצא צבע לא חוקי.");
      continue;
    }
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  for (const c of STICKER_COLORS) {
    const n = counts.get(c) ?? 0;
    if (n !== 9) errors.push(`חייב להיות בדיוק 9 מדבקות בצבע ${c}. (נמצא ${n})`);
  }

  const centers = CENTER_FACELETS.map((i) => input54Colors[i]).filter(Boolean);
  const uniqueCenters = new Set(centers);
  if (uniqueCenters.size !== 6) errors.push("המרכזים חייבים להיות שישה צבעים שונים.");

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

export function toURFDLBFacelets(input54Colors: StickerColor[]): string {
  if (input54Colors.length !== 54) throw new Error("Expected 54 colors");
  const map = buildColorMapFromCenters(input54Colors);
  return input54Colors.map((c) => map[c]).join("");
}

function buildColorMapFromCenters(input54Colors: StickerColor[]): Record<StickerColor, Face> {
  const centers = CENTER_FACELETS.map((i) => input54Colors[i]);
  const unique = new Set(centers);
  if (unique.size !== 6) {
    throw new Error("Centers must be six distinct colors.");
  }
  const map = {} as Record<StickerColor, Face>;
  const faces: Face[] = ["U", "R", "F", "D", "L", "B"];
  centers.forEach((color, idx) => {
    map[color] = faces[idx]!;
  });
  return map;
}

// --- Strict solvability / validity checks (cubejs.fromString() is permissive) ---
// These mappings are copied from cubejs' internal tables (0-based indices into URFDLB facelet string).
const cornerFacelet: ReadonlyArray<readonly number[]> = [
  [8, 9, 20], // URF
  [6, 18, 38], // UFL
  [0, 36, 47], // ULB
  [2, 45, 11], // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51], // DRB
];

const edgeFacelet: ReadonlyArray<readonly number[]> = [
  [5, 10], // UR
  [7, 19], // UF
  [3, 37], // UL
  [1, 46], // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
];

const cornerColor: ReadonlyArray<readonly Face[]> = [
  ["U", "R", "F"],
  ["U", "F", "L"],
  ["U", "L", "B"],
  ["U", "B", "R"],
  ["D", "F", "R"],
  ["D", "L", "F"],
  ["D", "B", "L"],
  ["D", "R", "B"],
];

const edgeColor: ReadonlyArray<readonly Face[]> = [
  ["U", "R"],
  ["U", "F"],
  ["U", "L"],
  ["U", "B"],
  ["D", "R"],
  ["D", "F"],
  ["D", "L"],
  ["D", "B"],
  ["F", "R"],
  ["F", "L"],
  ["B", "L"],
  ["B", "R"],
];

export type StrictCubeResult = { ok: true; cube: Cube } | { ok: false; errors: string[] };

export function fromFaceletsStrict(faceletsURFDLB: string): StrictCubeResult {
  const errors: string[] = [];
  if (faceletsURFDLB.length !== 54) errors.push("מחרוזת מצב קוביה חייבת להכיל 54 תווים.");
  if (!/^[URFDLB]+$/.test(faceletsURFDLB)) errors.push("מחרוזת מצב קוביה יכולה להכיל רק את התווים URFDLB.");
  if (errors.length) return { ok: false, errors };

  const counts: Record<Face, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (const ch of faceletsURFDLB as unknown as Face[]) counts[ch] += 1;
  for (const k of Object.keys(counts) as Face[]) {
    if (counts[k] !== 9) errors.push(`חייבים להיות בדיוק 9 מהתווים ${k}. (נמצא ${counts[k]})`);
  }

  // Parse corners + edges like cubejs, but also validate uniqueness and solvability constraints.
  const cp = Array.from({ length: 8 }, () => -1);
  const co = Array.from({ length: 8 }, () => 0);
  const ep = Array.from({ length: 12 }, () => -1);
  const eo = Array.from({ length: 12 }, () => 0);

  const usedCorners = new Set<number>();
  const usedEdges = new Set<number>();

  for (let i = 0; i < 8; i++) {
    const [a, b, c] = cornerFacelet[i];
    const cols = [faceletsURFDLB[a] as Face, faceletsURFDLB[b] as Face, faceletsURFDLB[c] as Face];
    let ori = 0;
    for (; ori < 3; ori++) {
      const ref = cols[ori];
      if (ref === "U" || ref === "D") break;
    }
    if (ori === 3) {
      errors.push("נמצא corner ללא צבע U/D (לא חוקי).");
      continue;
    }
    const col0 = cols[ori];
    const col1 = cols[(ori + 1) % 3];
    const col2 = cols[(ori + 2) % 3];

    let found = -1;
    for (let j = 0; j < 8; j++) {
      if (col0 === cornerColor[j][0] && col1 === cornerColor[j][1] && col2 === cornerColor[j][2]) {
        found = j;
        break;
      }
    }
    if (found === -1) {
      errors.push("נמצא corner עם שילוב צבעים לא חוקי.");
      continue;
    }
    if (usedCorners.has(found)) {
      errors.push("Corner כפול (שילוב צבעים חוזר).");
      continue;
    }
    usedCorners.add(found);
    cp[i] = found;
    co[i] = ori % 3;
  }

  for (let i = 0; i < 12; i++) {
    const [a, b] = edgeFacelet[i];
    const c1 = faceletsURFDLB[a] as Face;
    const c2 = faceletsURFDLB[b] as Face;
    let found = -1;
    let ori = 0;
    for (let j = 0; j < 12; j++) {
      const [e0, e1] = edgeColor[j];
      if (c1 === e0 && c2 === e1) {
        found = j;
        ori = 0;
        break;
      }
      if (c1 === e1 && c2 === e0) {
        found = j;
        ori = 1;
        break;
      }
    }
    if (found === -1) {
      errors.push("נמצא edge עם שילוב צבעים לא חוקי.");
      continue;
    }
    if (usedEdges.has(found)) {
      errors.push("Edge כפול (שילוב צבעים חוזר).");
      continue;
    }
    usedEdges.add(found);
    ep[i] = found;
    eo[i] = ori;
  }

  if (usedCorners.size !== 8) errors.push("לא זוהו כל ה-corners (בדוק/י את הזנת הצבעים).");
  if (usedEdges.size !== 12) errors.push("לא זוהו כל ה-edges (בדוק/י את הזנת הצבעים).");
  if (errors.length) return { ok: false, errors };

  // Orientation constraints
  const cornerOriSum = co.reduce((a, b) => a + b, 0);
  if (cornerOriSum % 3 !== 0) errors.push("סכום אוריינטציות של corners לא חוקי (Twist).");

  const edgeOriSum = eo.reduce((a, b) => a + b, 0);
  if (edgeOriSum % 2 !== 0) errors.push("סכום אוריינטציות של edges לא חוקי (Flip).");

  const cornerParity = permutationParity(cp);
  const edgeParity = permutationParity(ep);
  if (cornerParity !== edgeParity) errors.push("Parity לא חוקי (פינות/קצוות).");

  if (errors.length) return { ok: false, errors };

  const cube = new Cube({ center: [0, 1, 2, 3, 4, 5], cp, co, ep, eo });
  return { ok: true, cube };
}

export function isSolvable(faceletsURFDLB: string): { ok: true } | { ok: false; reason: string } {
  const strict = fromFaceletsStrict(faceletsURFDLB);
  if (!strict.ok) return { ok: false, reason: strict.errors.join("; ") };
  return { ok: true };
}

function permutationParity(perm: number[]): 0 | 1 {
  // 0 = even, 1 = odd
  let parity = 0;
  const visited = new Array(perm.length).fill(false);
  for (let i = 0; i < perm.length; i++) {
    if (visited[i]) continue;
    let cycleLen = 0;
    let j = i;
    while (!visited[j]) {
      visited[j] = true;
      j = perm[j]!;
      cycleLen++;
    }
    if (cycleLen > 0) parity ^= (cycleLen + 1) % 2;
  }
  return parity as 0 | 1;
}
