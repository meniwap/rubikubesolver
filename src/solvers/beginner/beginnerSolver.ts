import Cube from "cubejs";
import type { Alg, Face, Move } from "../../cube/types";
import { parseAlg } from "../../cube/notation";
import { ALGS } from "./algs";
import { getCurrentStage, Stage } from "./stages";

export type BeginnerHint = {
  stage: Stage;
  moves: Alg;
  explanationKey: string;
};

const EDGE_POS_U = [0, 1, 2, 3] as const;
const EDGE_POS_MIDDLE = [8, 9, 10, 11] as const;

const CORNER_POS_U = [0, 1, 2, 3] as const;
const CORNER_POS_D = [4, 5, 6, 7] as const;

const EDGE_FACELET: ReadonlyArray<readonly number[]> = [
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

export function getNextBeginnerHint(cube: Cube): BeginnerHint {
  const stage = getCurrentStage(cube);
  if (stage === Stage.Solved) return { stage, moves: [], explanationKey: "solved" };

  const work = cube.clone();
  let moves: Move[] = [];
  let explanationKey = "fallback";

  switch (stage) {
    case Stage.WhiteCross: {
      explanationKey = "white_cross";
      moves = solveWhiteCross(work);
      break;
    }
    case Stage.WhiteCorners: {
      explanationKey = "white_corners";
      moves = solveWhiteCorners(work);
      break;
    }
    case Stage.MiddleEdges: {
      explanationKey = "middle_edges";
      moves = solveMiddleEdges(work);
      break;
    }
    case Stage.YellowCross: {
      explanationKey = "yellow_cross";
      moves = solveYellowCross(work);
      break;
    }
    case Stage.YellowCornersOrient: {
      explanationKey = "yellow_corners_orient";
      moves = solveYellowCornersOrient(work);
      break;
    }
    case Stage.YellowCornersPermute: {
      explanationKey = "yellow_corners_permute";
      moves = solveYellowCornersPermute(work);
      break;
    }
    case Stage.YellowEdgesPermute: {
      explanationKey = "yellow_edges_permute";
      moves = solveYellowEdgesPermute(work);
      break;
    }
    default:
      moves = [];
  }

  if (moves.length === 0) {
    // Safety fallback: just follow optimal solution one move at a time.
    Cube.initSolver();
    const solution = cube.solve();
    const parsed = parseAlg(solution);
    moves = parsed.slice(0, 1);
    explanationKey = "optimal_fallback";
  }

  return { stage, moves, explanationKey };
}

export function computeBeginnerSolution(cube: Cube, maxMoves = 400): Alg {
  const work = cube.clone();
  const out: Move[] = [];
  for (let i = 0; i < maxMoves && !work.isSolved(); i++) {
    const hint = getNextBeginnerHint(work);
    if (hint.moves.length === 0) break;
    for (const m of hint.moves) {
      work.move(toToken(m));
      out.push(m);
      if (out.length >= maxMoves) break;
    }
  }
  return out;
}

// --- Stage solvers ---

function solveWhiteCross(cube: Cube): Alg {
  const path = solveCrossBFS(cube);
  return path;
}

function solveWhiteCorners(cube: Cube): Alg {
  const out: Move[] = [];
  const targets: Array<{ piece: number; abovePos: number; alg: string }> = [
    { piece: 4, abovePos: 0, alg: "R U R'" }, // DFR above URF
    { piece: 5, abovePos: 1, alg: "L' U' L" }, // DLF above UFL
    { piece: 6, abovePos: 2, alg: "B' U' B" }, // DBL above ULB
    { piece: 7, abovePos: 3, alg: "B U B'" }, // DRB above UBR
  ];

  for (const t of targets) {
    const targetPos = t.piece;
    let guard = 0;
    while (!(cube.cp[targetPos] === t.piece && cube.co[targetPos] === 0) && guard++ < 30) {
      const posNow = findCornerPos(cube, t.piece);
      if (posNow === -1) break;

      if (CORNER_POS_D.includes(posNow as any)) {
        // Eject from its current D-slot by applying that slot's trigger once.
        const ejectAlg = triggerForBottomCornerPos(posNow);
        out.push(...parseAlg(ejectAlg));
        cube.move(ejectAlg);
        continue;
      }

      if (CORNER_POS_U.includes(posNow as any)) {
        const uTurns = bringTopCornerToPos(cube, t.piece, t.abovePos);
        out.push(...uTurns);
        if (uTurns.length) cube.move(format(uTurns));

        // Insert: repeat trigger until solved (max 6).
        for (let i = 0; i < 6; i++) {
          if (cube.cp[targetPos] === t.piece && cube.co[targetPos] === 0) break;
          out.push(...parseAlg(t.alg));
          cube.move(t.alg);
        }
        continue;
      }

      // If somehow in middle (shouldn't happen for corners), fallback by applying U.
      out.push({ face: "U", amount: 1 });
      cube.move("U");
    }
  }

  return out;
}

function solveMiddleEdges(cube: Cube): Alg {
  const out: Move[] = [];

  let guard = 0;
  while (!areMiddleEdgesSolved(cube) && guard++ < 40) {
    const insertion = planMiddleInsertion(cube);
    if (insertion) {
      out.push(...insertion.moves);
      cube.move(format(insertion.moves));
      continue;
    }

    const wrongSlot = findWrongMiddleSlot(cube);
    if (wrongSlot === -1) break;

    // No insertable edge found in U layer: eject a wrong middle edge to U.
    const alg = ejectMiddleEdgeAlgForSlot(wrongSlot);
    out.push(...parseAlg(alg));
    cube.move(alg);
  }

  return out;
}

function solveYellowCross(cube: Cube): Alg {
  return solveOrientTopEdgesBfs(cube);
}

function solveYellowCornersOrient(cube: Cube): Alg {
  return solveOrientTopCornersBfs(cube);
}

function solveYellowCornersPermute(cube: Cube): Alg {
  const ops = [
    { name: "U", moves: parseAlg("U") },
    { name: "U'", moves: parseAlg("U'") },
    { name: "U2", moves: parseAlg("U2") },
    { name: "N", moves: parseAlg(ALGS.niklas) },
  ] as const;

  const goal = encodeTopCorners([0, 1, 2, 3]);
  const start = encodeTopCorners(cube.cp.slice(0, 4));
  if (start === goal) return [];

  const prev = new Map<number, { p: number; op: number }>();
  const queue: Array<{ key: number; cube: Cube }> = [{ key: start, cube: cube.clone() }];
  prev.set(start, { p: start, op: -1 });

  while (queue.length) {
    const cur = queue.shift()!;
    for (let i = 0; i < ops.length; i++) {
      const nextCube = cur.cube.clone();
      nextCube.move(format(ops[i].moves));
      const nextKey = encodeTopCorners(nextCube.cp.slice(0, 4));
      if (prev.has(nextKey)) continue;
      prev.set(nextKey, { p: cur.key, op: i });
      if (nextKey === goal) {
        return reconstructOps(prev, start, goal, ops).flatMap((o) => o.moves);
      }
      queue.push({ key: nextKey, cube: nextCube });
    }
  }

  return [];
}

function solveYellowEdgesPermute(cube: Cube): Alg {
  const ops = [
    { name: "U", moves: parseAlg("U") },
    { name: "U'", moves: parseAlg("U'") },
    { name: "U2", moves: parseAlg("U2") },
    { name: "Ua", moves: parseAlg(ALGS.ua) },
    { name: "Ub", moves: parseAlg(ALGS.ub) },
  ] as const;

  const goal = encodeLastLayerPerm({ cp: [0, 1, 2, 3], ep: [0, 1, 2, 3] });
  const start = encodeLastLayerPerm({ cp: cube.cp.slice(0, 4), ep: cube.ep.slice(0, 4) });
  if (start === goal) return [];

  const prev = new Map<number, { p: number; op: number }>();
  const queue: Array<{ key: number; cube: Cube }> = [{ key: start, cube: cube.clone() }];
  prev.set(start, { p: start, op: -1 });

  while (queue.length) {
    const cur = queue.shift()!;
    for (let i = 0; i < ops.length; i++) {
      const nextCube = cur.cube.clone();
      nextCube.move(format(ops[i].moves));
      const nextKey = encodeLastLayerPerm({ cp: nextCube.cp.slice(0, 4), ep: nextCube.ep.slice(0, 4) });
      if (prev.has(nextKey)) continue;
      prev.set(nextKey, { p: cur.key, op: i });
      if (nextKey === goal) {
        return reconstructOps(prev, start, goal, ops).flatMap((o) => o.moves);
      }
      queue.push({ key: nextKey, cube: nextCube });
    }
  }

  return [];
}

// --- Cross BFS on reduced state (4 D-layer edges) ---

type EdgeMoveTable = { perm: number[]; flip: number[] };
const EDGE_TABLES = buildEdgeMoveTables();
const CROSS_EDGE_PIECES = [4, 5, 6, 7] as const;
const GOAL_CROSS = encodeCrossStateFromPositions([
  { pos: 4, ori: 0 },
  { pos: 5, ori: 0 },
  { pos: 6, ori: 0 },
  { pos: 7, ori: 0 },
]);

function solveCrossBFS(cube: Cube): Alg {
  const start = encodeCrossFromCube(cube);
  if (start === GOAL_CROSS) return [];

  const queue: number[] = [start];
  let qi = 0;

  const visitedGen = getVisitedGen();
  const prev = getPrev();
  const prevMove = getPrevMove();

  markVisited(start, visitedGen);
  prev[start] = start;
  prevMove[start] = -1;

  while (qi < queue.length) {
    const cur = queue[qi++]!;
    for (let mi = 0; mi < EDGE_TABLES.length; mi++) {
      const next = applyMoveToCross(cur, EDGE_TABLES[mi]!);
      if (isVisited(next, visitedGen)) continue;
      markVisited(next, visitedGen);
      prev[next] = cur;
      prevMove[next] = mi;
      if (next === GOAL_CROSS) return reconstructCrossPath(prev, prevMove, start, next);
      queue.push(next);
    }
  }

  return [];
}

// We use 1<<20 for encoding 4 pieces * 5 bits.
const MAX_CROSS_STATE = 1 << 20;
let gen = 1;
const seenStamp = new Uint32Array(MAX_CROSS_STATE);
const prevCross = new Int32Array(MAX_CROSS_STATE);
const prevMoveCross = new Int16Array(MAX_CROSS_STATE);

function getVisitedGen(): number {
  gen++;
  if (gen === 0xffffffff) {
    seenStamp.fill(0);
    gen = 1;
  }
  return gen;
}

function isVisited(code: number, g: number): boolean {
  return seenStamp[code] === g;
}
function markVisited(code: number, g: number) {
  seenStamp[code] = g;
}
function getPrev(): Int32Array {
  return prevCross;
}
function getPrevMove(): Int16Array {
  return prevMoveCross;
}

function encodeCrossFromCube(cube: Cube): number {
  const positions = [
    { pos: -1, ori: 0 },
    { pos: -1, ori: 0 },
    { pos: -1, ori: 0 },
    { pos: -1, ori: 0 },
  ];
  for (let pos = 0; pos < 12; pos++) {
    const piece = cube.ep[pos]!;
    const idx = CROSS_EDGE_PIECES.indexOf(piece as any);
    if (idx === -1) continue;
    positions[idx] = { pos, ori: cube.eo[pos]! };
  }
  return encodeCrossStateFromPositions(positions);
}

function encodeCrossStateFromPositions(positions: Array<{ pos: number; ori: number }>): number {
  let code = 0;
  for (let i = 0; i < 4; i++) {
    const p = positions[i]!;
    code |= (p.pos & 0x0f) << (i * 5);
    code |= (p.ori & 0x01) << (i * 5 + 4);
  }
  return code >>> 0;
}

function applyMoveToCross(code: number, table: EdgeMoveTable): number {
  let next = 0;
  for (let i = 0; i < 4; i++) {
    const chunk = (code >>> (i * 5)) & 0x1f;
    const pos = chunk & 0x0f;
    const ori = (chunk >>> 4) & 0x01;
    const newPos = table.perm[pos]!;
    const newOri = ori ^ (table.flip[pos] ?? 0);
    next |= (newPos & 0x0f) << (i * 5);
    next |= (newOri & 0x01) << (i * 5 + 4);
  }
  return next >>> 0;
}

function reconstructCrossPath(prev: Int32Array, prevMove: Int16Array, start: number, goal: number): Alg {
  const moves: Move[] = [];
  let cur = goal;
  while (cur !== start) {
    const mi = prevMove[cur]!;
    if (mi < 0) break;
    moves.push(MOVE_SET[mi]!);
    cur = prev[cur]!;
  }
  moves.reverse();
  return moves;
}

const MOVE_SET: Move[] = buildMoveSet();
function buildMoveSet(): Move[] {
  const faces: Face[] = ["U", "R", "F", "D", "L", "B"];
  const out: Move[] = [];
  for (const f of faces) {
    out.push({ face: f, amount: 1 });
    out.push({ face: f, amount: -1 });
    out.push({ face: f, amount: 2 });
  }
  return out;
}

function buildEdgeMoveTables(): EdgeMoveTable[] {
  const baseFaces: Face[] = ["U", "R", "F", "D", "L", "B"];
  const quarter: Record<Face, EdgeMoveTable> = {} as any;

  for (const f of baseFaces) {
    const c = new Cube();
    c.move(f);
    // Build oldPos -> newPos mapping using identity pieces.
    const perm = Array.from({ length: 12 }, () => 0);
    const flip = Array.from({ length: 12 }, () => 0);
    for (let newPos = 0; newPos < 12; newPos++) {
      const oldPiece = c.ep[newPos]!;
      perm[oldPiece] = newPos;
      flip[oldPiece] = c.eo[newPos]!;
    }
    quarter[f] = { perm, flip };
  }

  const moves: EdgeMoveTable[] = [];
  for (const f of baseFaces) {
    const q = quarter[f]!;
    const q2 = composeEdgeTables(q, q);
    const q3 = composeEdgeTables(q2, q);
    moves.push(q); // amount 1
    moves.push(q3); // amount -1
    moves.push(q2); // amount 2
  }
  return moves;
}

function composeEdgeTables(a: EdgeMoveTable, b: EdgeMoveTable): EdgeMoveTable {
  // Apply a then b
  const perm = Array.from({ length: 12 }, () => 0);
  const flip = Array.from({ length: 12 }, () => 0);
  for (let oldPos = 0; oldPos < 12; oldPos++) {
    const pos1 = a.perm[oldPos]!;
    const pos2 = b.perm[pos1]!;
    perm[oldPos] = pos2;
    flip[oldPos] = (a.flip[oldPos]! ^ b.flip[pos1]!) & 1;
  }
  return { perm, flip };
}

// --- Helpers ---

function toToken(m: Move): string {
  return m.amount === 1 ? m.face : m.amount === -1 ? `${m.face}'` : `${m.face}2`;
}

function format(moves: Move[]): string {
  return moves.map(toToken).join(" ");
}

function findCornerPos(cube: Cube, cornerPiece: number): number {
  for (let pos = 0; pos < 8; pos++) if (cube.cp[pos] === cornerPiece) return pos;
  return -1;
}

function triggerForBottomCornerPos(pos: number): string {
  switch (pos) {
    case 4:
      return "R U R'";
    case 5:
      return "L' U' L";
    case 6:
      return "B' U' B";
    case 7:
      return "B U B'";
    default:
      return "U";
  }
}

function bringTopCornerToPos(cube: Cube, cornerPiece: number, targetTopPos: number): Move[] {
  for (const t of [0, 1, 2, 3]) {
    const cloned = cube.clone();
    const setup = uTurns(t);
    if (setup.length) cloned.move(format(setup));
    const posAfter = findCornerPos(cloned, cornerPiece);
    if (posAfter === targetTopPos) return setup;
  }
  return [];
}

function uTurns(k: number): Move[] {
  const t = ((k % 4) + 4) % 4;
  if (t === 0) return [];
  if (t === 1) return [{ face: "U", amount: 1 }];
  if (t === 2) return [{ face: "U", amount: 2 }];
  return [{ face: "U", amount: -1 }];
}

function areMiddleEdgesSolved(cube: Cube): boolean {
  for (const pos of EDGE_POS_MIDDLE) {
    if (cube.ep[pos] !== pos) return false;
    if (cube.eo[pos] !== 0) return false;
  }
  return true;
}

function findWrongMiddleSlot(cube: Cube): number {
  for (const pos of EDGE_POS_MIDDLE) {
    if (cube.ep[pos] !== pos || cube.eo[pos] !== 0) return pos;
  }
  return -1;
}

function ejectMiddleEdgeAlgForSlot(slotPos: number): string {
  // Slot positions: 8=FR, 9=FL, 10=BL, 11=BR
  if (slotPos === 8) return ALGS.middleRight;
  if (slotPos === 9) return ALGS.middleLeft;
  if (slotPos === 10) return yRotateAlgText(ALGS.middleRight, 2); // front=B, right insert -> BL
  if (slotPos === 11) return yRotateAlgText(ALGS.middleLeft, 2); // front=B, left insert -> BR
  return ALGS.middleRight;
}

function planMiddleInsertion(cube: Cube): { moves: Move[] } | null {
  // Try 0..3 U setups to find an aligned middle-edge in U layer.
  for (const setup of [0, 1, 2, 3]) {
    const c = cube.clone();
    const u = uTurns(setup);
    if (u.length) c.move(format(u));
    const pick = pickAlignedMiddleEdgeInU(c);
    if (!pick) continue;

    const front = pick.front;
    const other = pick.other;
    const { left, right } = adjacentFaces(front);
    const dir = other === right ? "right" : other === left ? "left" : null;
    if (!dir) continue;

    const baseAlg = dir === "right" ? ALGS.middleRight : ALGS.middleLeft;
    const rot = yRotToMapFTo(front);
    const alg = yRotateAlgText(baseAlg, rot);

    return { moves: [...u, ...parseAlg(alg)] };
  }

  return null;
}

function pickAlignedMiddleEdgeInU(cube: Cube): { front: Face; other: Face } | null {
  const s = cube.asString();

  for (const pos of EDGE_POS_U) {
    const piece = cube.ep[pos]!;
    if (piece < 8) continue; // only middle edges (FR..BR)

    const [a, b] = EDGE_FACELET[pos]!;

    // One of (a,b) is on U face; the other is on a side face. Detect by index.
    const aIsU = a >= 0 && a <= 8;
    const sideIndex = aIsU ? b : a;
    const uIndex = aIsU ? a : b;

    const sideFace = sideFaceForUPos(pos);
    const sideLetter = s[sideIndex] as Face;
    if (sideLetter !== sideFace) continue; // not aligned with center

    const other = s[uIndex] as Face;
    if (other === "U" || other === "D") continue;

    return { front: sideFace, other };
  }

  return null;
}

function sideFaceForUPos(pos: number): Face {
  switch (pos) {
    case 0:
      return "R";
    case 1:
      return "F";
    case 2:
      return "L";
    case 3:
      return "B";
    default:
      return "F";
  }
}

function adjacentFaces(front: Face): { left: Face; right: Face } {
  switch (front) {
    case "F":
      return { left: "L", right: "R" };
    case "R":
      return { left: "F", right: "B" };
    case "B":
      return { left: "R", right: "L" };
    case "L":
      return { left: "B", right: "F" };
    default:
      return { left: "L", right: "R" };
  }
}

function yRotToMapFTo(face: Face): number {
  switch (face) {
    case "F":
      return 0;
    case "R":
      return 1;
    case "B":
      return 2;
    case "L":
      return 3;
    default:
      return 0;
  }
}

function yRotateAlgText(alg: string, turns: number): string {
  const moves = parseAlg(alg);
  const t = ((turns % 4) + 4) % 4;
  if (t === 0) return alg;
  const rotated = moves.map((m) => ({ ...m, face: rotateFaceY(m.face, t) }));
  return format(rotated);
}

function rotateFaceY(face: Face, turns: number): Face {
  const t = ((turns % 4) + 4) % 4;
  if (face === "U" || face === "D") return face;
  const cycle: Face[] = ["F", "R", "B", "L"];
  const idx = cycle.indexOf(face);
  return cycle[(idx + t) % 4]!;
}

function areUEdgesOriented(cube: Cube): boolean {
  return EDGE_POS_U.every((pos) => cube.eo[pos] === 0);
}

function solveOrientTopEdgesBfs(cube: Cube): Alg {
  if (areUEdgesOriented(cube)) return [];

  const ops = [
    { moves: parseAlg("U") },
    { moves: parseAlg("U'") },
    { moves: parseAlg("U2") },
    { moves: parseAlg(ALGS.yellowCross) },
    { moves: parseAlg("F U R U' R' F'") }, // inverse of yellowCross
  ] as const;

  const start = encodeTopEdgesEpEo(cube);
  const queue: Array<{ key: number; cube: Cube }> = [{ key: start, cube: cube.clone() }];
  const prev = new Map<number, { p: number; op: number }>();
  prev.set(start, { p: start, op: -1 });

  while (queue.length) {
    const cur = queue.shift()!;
    if (areUEdgesOriented(cur.cube)) return reconstructOps(prev, start, cur.key, ops).flatMap((o) => o.moves);

    for (let i = 0; i < ops.length; i++) {
      const next = cur.cube.clone();
      next.move(format(ops[i].moves));
      const key = encodeTopEdgesEpEo(next);
      if (prev.has(key)) continue;
      prev.set(key, { p: cur.key, op: i });
      queue.push({ key, cube: next });
    }
  }

  return [];
}

function encodeTopEdgesEpEo(cube: Cube): number {
  const ep = cube.ep.slice(0, 4);
  const eo = cube.eo.slice(0, 4);
  const perm = permRank4(ep);
  const bits = (eo[0]! & 1) | ((eo[1]! & 1) << 1) | ((eo[2]! & 1) << 2) | ((eo[3]! & 1) << 3);
  return perm * 16 + bits;
}

function areUCornersOriented(cube: Cube): boolean {
  return CORNER_POS_U.every((pos) => cube.co[pos] === 0);
}

function solveOrientTopCornersBfs(cube: Cube): Alg {
  if (areUCornersOriented(cube)) return [];

  const ops = [
    { moves: parseAlg("U") },
    { moves: parseAlg("U'") },
    { moves: parseAlg("U2") },
    { moves: parseAlg(ALGS.sune) },
    { moves: parseAlg(ALGS.antiSune) },
  ] as const;

  const start = encodeTopCornersCoCp(cube);

  const queue: Array<{ key: number; cube: Cube }> = [{ key: start, cube: cube.clone() }];
  const prev = new Map<number, { p: number; op: number }>();
  prev.set(start, { p: start, op: -1 });

  while (queue.length) {
    const cur = queue.shift()!;
    if (areUCornersOriented(cur.cube)) {
      return reconstructOps(prev, start, cur.key, ops).flatMap((o) => o.moves);
    }
    for (let i = 0; i < ops.length; i++) {
      const nextCube = cur.cube.clone();
      nextCube.move(format(ops[i].moves));
      const nextKey = encodeTopCornersCoCp(nextCube);
      if (prev.has(nextKey)) continue;
      prev.set(nextKey, { p: cur.key, op: i });
      queue.push({ key: nextKey, cube: nextCube });
    }
  }

  return [];
}

function encodeTopCornersCoCp(cube: Cube): number {
  const cp = cube.cp.slice(0, 4);
  const co = cube.co.slice(0, 4);
  const perm = permRank4(cp);
  const ori = ((co[0]! * 3 + co[1]!) * 3 + co[2]!) * 3 + co[3]!;
  return perm * 81 + ori;
}

function permRank4(p: number[]): number {
  const list = [0, 1, 2, 3];
  let rank = 0;
  const facts = [6, 2, 1, 1];
  for (let i = 0; i < 4; i++) {
    const v = p[i]!;
    const idx = list.indexOf(v);
    if (idx === -1) return 0;
    rank += idx * facts[i]!;
    list.splice(idx, 1);
  }
  return rank;
}

function encodeTopCorners(cp4: number[]): number {
  // 24 states, encode base-4
  return (cp4[0]! & 3) | ((cp4[1]! & 3) << 2) | ((cp4[2]! & 3) << 4) | ((cp4[3]! & 3) << 6);
}

function encodeLastLayerPerm(input: { cp: number[]; ep: number[] }): number {
  const cpRank = permRank4(input.cp);
  const epRank = permRank4(input.ep);
  return cpRank * 24 + epRank;
}

function reconstructOps<T extends readonly { moves: Move[] }[]>(
  prev: Map<number, { p: number; op: number }>,
  start: number,
  goal: number,
  ops: T,
): Array<T[number]> {
  const out: Array<T[number]> = [];
  let cur = goal;
  while (cur !== start) {
    const step = prev.get(cur);
    if (!step || step.op < 0) break;
    out.push(ops[step.op]!);
    cur = step.p;
  }
  out.reverse();
  return out;
}
