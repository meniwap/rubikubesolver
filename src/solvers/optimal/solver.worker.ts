import Cube from "cubejs";
import { parseAlg } from "../../cube/notation";
import type { Alg } from "../../cube/types";

type SolveRequest = { id: number; type: "solve"; facelets: string };
type SolveResponse = { id: number; ok: true; moves: Alg } | { id: number; ok: false; error: string };

let inited = false;
function initOnce() {
  if (inited) return;
  Cube.initSolver();
  inited = true;
}

self.onmessage = (ev: MessageEvent<SolveRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== "solve") return;

  initOnce();
  try {
    const cube = Cube.fromString(msg.facelets);
    const solution = cube.solve();
    const moves = parseAlg(solution);
    const res: SolveResponse = { id: msg.id, ok: true, moves };
    self.postMessage(res);
  } catch (e) {
    const res: SolveResponse = { id: msg.id, ok: false, error: e instanceof Error ? e.message : String(e) };
    self.postMessage(res);
  }
};

