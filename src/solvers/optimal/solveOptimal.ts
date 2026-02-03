import Cube from "cubejs";
import { invertMove, moveToToken, parseAlg } from "../../cube/notation";
import type { Alg, Face, Move, TurnAmount } from "../../cube/types";

type SolveRequest = { id: number; type: "solve"; facelets: string };
type SolveResponse = { id: number; ok: true; moves: Alg } | { id: number; ok: false; error: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: Alg) => void; reject: (e: Error) => void }>();

const SHORT_FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
const SHORT_AMOUNTS: TurnAmount[] = [1, -1, 2];
const SHORT_MOVES: Move[] = SHORT_FACES.flatMap((face) => SHORT_AMOUNTS.map((amount) => ({ face, amount })));
const HALF_DEPTH = 4;

let shortMap: Map<string, Alg> | null = null;

function buildShortMap(): Map<string, Alg> {
  const map = new Map<string, Alg>();
  const start = new Cube();
  map.set(start.asString(), []);

  type Node = { cube: Cube; moves: Alg; lastFace: Face | null };
  let frontier: Node[] = [{ cube: start, moves: [], lastFace: null }];

  for (let depth = 1; depth <= HALF_DEPTH; depth++) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const move of SHORT_MOVES) {
        if (node.lastFace === move.face) continue;
        const cube = node.cube.clone().move(moveToToken(move));
        const key = cube.asString();
        if (map.has(key)) continue;
        const solveMoves = [invertMove(move), ...node.moves];
        map.set(key, solveMoves);
        if (depth < HALF_DEPTH) next.push({ cube, moves: solveMoves, lastFace: move.face });
      }
    }
    frontier = next;
  }
  return map;
}

function getShortMap(): Map<string, Alg> {
  if (!shortMap) shortMap = buildShortMap();
  return shortMap;
}

function findShortSolution(faceletsURFDLB: string): Alg | null {
  const map = getShortMap();
  const start = Cube.fromString(faceletsURFDLB);
  if (start.isSolved()) return [];

  const startKey = start.asString();
  const direct = map.get(startKey);
  if (direct) return direct;

  const seen = new Set<string>();
  seen.add(startKey);

  type Node = { cube: Cube; moves: Alg; lastFace: Face | null };
  let frontier: Node[] = [{ cube: start, moves: [], lastFace: null }];
  let best: Alg | null = null;

  for (let depth = 1; depth <= HALF_DEPTH; depth++) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const move of SHORT_MOVES) {
        if (node.lastFace === move.face) continue;
        const cube = node.cube.clone().move(moveToToken(move));
        const key = cube.asString();
        if (seen.has(key)) continue;
        const moves = [...node.moves, move];
        const tail = map.get(key);
        if (tail) {
          const candidate = [...moves, ...tail];
          if (!best || candidate.length < best.length) best = candidate;
        }
        seen.add(key);
        if (depth < HALF_DEPTH) next.push({ cube, moves, lastFace: move.face });
      }
    }
    frontier = next;
    if (best) {
      if (depth >= best.length) break;
    }
  }

  return best;
}

function ensureWorker(): Worker | null {
  if (worker) return worker;
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (import.meta.env.MODE === "test") return null;

  worker = new Worker(new URL("./solver.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<SolveResponse>) => {
    const msg = ev.data;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.moves);
    else p.reject(new Error(msg.error));
  };
  worker.onerror = (err) => {
    for (const { reject } of pending.values()) reject(new Error(String(err)));
    pending.clear();
    worker?.terminate();
    worker = null;
  };

  return worker;
}

export async function solveOptimal(faceletsURFDLB: string): Promise<Alg> {
  const short = findShortSolution(faceletsURFDLB);
  if (short) return short;

  const w = ensureWorker();
  if (!w) {
    // Fallback for tests / non-worker environments.
    Cube.initSolver();
    const cube = Cube.fromString(faceletsURFDLB);
    return parseAlg(cube.solve());
  }

  const id = nextId++;
  const req: SolveRequest = { id, type: "solve", facelets: faceletsURFDLB };
  const promise = new Promise<Alg>((resolve, reject) => pending.set(id, { resolve, reject }));
  w.postMessage(req);
  return promise;
}
