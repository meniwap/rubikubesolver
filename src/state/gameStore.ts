import Cube from "cubejs";
import { create } from "zustand";
import type { Alg, Face, Move } from "../cube/types";
import { formatMoves, invertAlg, parseAlg } from "../cube/notation";
import { generateFallbackScramble } from "../cube/scramble";
import { solveOptimal } from "../solvers/optimal/solveOptimal";
import { computeBeginnerSolution, getNextBeginnerHint } from "../solvers/beginner/beginnerSolver";
import { stageLabelHe } from "../solvers/beginner/stages";
import { FACE_TO_COLOR, isSolvable, type StickerColor } from "../cube/validation";
import { formatMs } from "../utils/time";

export type GameMode = "play" | "learn";

export type Settings = {
  animationMs: number;
};

export type TimerState = {
  running: boolean;
  startedAt: number | null;
  elapsedMs: number;
};

export type PlayStats = {
  bestMs: number | null;
  lastMs: number | null;
  solves: number;
};

export type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | { kind: "info"; message: string };

export type HintState = {
  title: string;
  explanation: string;
  moves: Alg;
};

export type HintMode = "auto" | "beginner" | "optimal";

export type MoveSource = "user" | "system";

type QueuedMove = { move: Move; recordHistory: boolean; source: MoveSource };

type GameState = {
  mode: GameMode;
  cube: Cube;
  facelets: string;
  faceColors: Record<Face, StickerColor>;
  visualResetKey: number;

  history: Move[];
  redo: Move[];

  queue: QueuedMove[];
  current: QueuedMove | null;
  isAnimating: boolean;

  hint: HintState | null;
  status: Status;
  settings: Settings;
  timer: TimerState;
  isSolved: boolean;
  pendingTimerStart: boolean;
  stats: PlayStats;

  setMode: (mode: GameMode) => void;
  setAnimationMs: (ms: number) => void;
  setStatus: (status: Status) => void;

  reset: (opts?: { faceColors?: Record<Face, StickerColor>; keepFaceColors?: boolean }) => void;
  enqueueMoves: (moves: Alg, opts?: { recordHistory?: boolean; source?: MoveSource }) => void;
  enqueueAlg: (algText: string, opts?: { recordHistory?: boolean; source?: MoveSource }) => void;

  startNextMove: () => void;
  finishCurrentMove: () => void;

  scramble: () => void;
  undo: () => void;
  redoMove: () => void;
  startSolve: () => void;

  requestHint: (mode?: HintMode) => Promise<void>;
  requestSolveOptimal: () => Promise<void>;
  requestSolveBeginner: () => Promise<void>;
  stopMoves: () => void;

  loadFromFacelets: (
    faceletsURFDLB: string,
    targetMode: GameMode,
    faceColors?: Record<Face, StickerColor>,
  ) => Promise<void>;

  timerToggle: () => void;
  timerReset: () => void;
};

const SOLVED_FACELETS = new Cube().asString();
const STAT_KEY = "rubik.solve.stats.v1";

const DEFAULT_STATS: PlayStats = { bestMs: null, lastMs: null, solves: 0 };
let solverReady = false;

function ensureSolverReady() {
  if (solverReady) return;
  try {
    Cube.initSolver();
    solverReady = true;
  } catch {
    solverReady = false;
  }
}

ensureSolverReady();

function defaultFaceColors(): Record<Face, StickerColor> {
  return { ...FACE_TO_COLOR };
}

function loadStats(): PlayStats {
  if (typeof window === "undefined") return { ...DEFAULT_STATS };
  try {
    const raw = window.localStorage.getItem(STAT_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<PlayStats>;
    return {
      bestMs: typeof parsed.bestMs === "number" ? parsed.bestMs : null,
      lastMs: typeof parsed.lastMs === "number" ? parsed.lastMs : null,
      solves: typeof parsed.solves === "number" ? parsed.solves : 0,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats: PlayStats) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAT_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

function recordSolve(stats: PlayStats, timeMs: number): PlayStats {
  const bestMs = stats.bestMs == null ? timeMs : Math.min(stats.bestMs, timeMs);
  const next: PlayStats = {
    bestMs,
    lastMs: timeMs,
    solves: stats.solves + 1,
  };
  saveStats(next);
  return next;
}

function getTimerMs(timer: TimerState, now = Date.now()): number {
  return timer.elapsedMs + (timer.running && timer.startedAt ? now - timer.startedAt : 0);
}

function createScrambleMoves(): Alg {
  try {
    ensureSolverReady();
    return parseAlg(Cube.scramble());
  } catch {
    return generateFallbackScramble();
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: "play",
  cube: new Cube(),
  facelets: SOLVED_FACELETS,
  faceColors: defaultFaceColors(),
  visualResetKey: 0,

  history: [],
  redo: [],

  queue: [],
  current: null,
  isAnimating: false,

  hint: null,
  status: { kind: "idle" },
  settings: { animationMs: 180 },
  timer: { running: false, startedAt: null, elapsedMs: 0 },
  isSolved: true,
  pendingTimerStart: false,
  stats: loadStats(),

  setMode: (mode) => set({ mode }),
  setAnimationMs: (ms) => set({ settings: { ...get().settings, animationMs: clamp(ms, 60, 900) } }),
  setStatus: (status) => set({ status }),

  reset: (opts) =>
    set((state) => ({
      cube: new Cube(),
      facelets: SOLVED_FACELETS,
      faceColors: opts?.faceColors ?? (opts?.keepFaceColors ? state.faceColors : defaultFaceColors()),
      history: [],
      redo: [],
      queue: [],
      current: null,
      isAnimating: false,
      hint: null,
      status: { kind: "idle" },
      timer: { running: false, startedAt: null, elapsedMs: 0 },
      isSolved: true,
      pendingTimerStart: false,
      visualResetKey: get().visualResetKey + 1,
    })),

  enqueueMoves: (moves, opts) => {
    const recordHistory = opts?.recordHistory ?? true;
    const source = opts?.source ?? "user";
    if (moves.length === 0) return;
    set((s) => ({
      queue: [...s.queue, ...moves.map((move) => ({ move, recordHistory, source }))],
      hint: null,
    }));
    get().startNextMove();
  },

  enqueueAlg: (algText, opts) => {
    const moves = parseAlg(algText);
    get().enqueueMoves(moves, opts);
  },

  startNextMove: () => {
    const s = get();
    if (s.isAnimating || s.current || s.queue.length === 0) return;
    const [next, ...rest] = s.queue;
    if (!next) return;
    set({ current: next, queue: rest, isAnimating: true });
  },

  finishCurrentMove: () => {
    const s = get();
    const cur = s.current;
    if (!cur) return;
    const token = formatMoves([cur.move]);
    s.cube.move(token);
    const nextFacelets = s.cube.asString();
    const solved = s.cube.isSolved();
    const now = Date.now();
    const shouldStartTimer = s.pendingTimerStart && cur.source === "user" && !s.timer.running;

    let nextTimer = s.timer;
    let nextStatus: Status | null = null;
    let nextStats = s.stats;
    let nextPending = s.pendingTimerStart;

    if (shouldStartTimer) {
      nextTimer = { running: true, startedAt: now, elapsedMs: 0 };
      nextPending = false;
      nextStatus = { kind: "info", message: "הטיימר התחיל! בהצלחה." };
    }

    if (solved) {
      const totalMs = getTimerMs(s.timer, now);
      nextTimer = { running: false, startedAt: null, elapsedMs: totalMs };
      nextPending = false;
      if (totalMs > 0) {
        nextStats = recordSolve(s.stats, totalMs);
        nextStatus = { kind: "info", message: `פתרת! זמן: ${formatMs(totalMs)}` };
      } else {
        nextStatus = { kind: "info", message: "הקובייה פתורה." };
      }
    }

    set((state) => ({
      cube: state.cube,
      facelets: nextFacelets,
      history: cur.recordHistory ? [...state.history, cur.move] : state.history,
      redo: cur.recordHistory ? [] : state.redo,
      current: null,
      isAnimating: false,
      isSolved: solved,
      timer: nextTimer,
      pendingTimerStart: nextPending,
      status: nextStatus ?? state.status,
      stats: nextStats,
    }));
  },

  scramble: () => {
    const s = get();
    if (s.isAnimating) return;
    const moves = createScrambleMoves();
    s.reset({ keepFaceColors: true });
    get().enqueueMoves(moves, { recordHistory: false, source: "system" });
    set({ isSolved: false, pendingTimerStart: false });
    set({ status: { kind: "info", message: "בוצע ערבוב (Scramble)." } });
  },

  undo: () => {
    const s = get();
    if (s.isAnimating || s.current || s.queue.length > 0) return;
    if (s.history.length === 0) return;
    const last = s.history[s.history.length - 1]!;
    set({ history: s.history.slice(0, -1), redo: [...s.redo, last], hint: null });
    get().enqueueMoves(invertAlg([last]), { recordHistory: false, source: "system" });
  },

  redoMove: () => {
    const s = get();
    if (s.isAnimating || s.current || s.queue.length > 0) return;
    if (s.redo.length === 0) return;
    const next = s.redo[s.redo.length - 1]!;
    set({ redo: s.redo.slice(0, -1), history: [...s.history, next], hint: null });
    get().enqueueMoves([next], { recordHistory: false, source: "system" });
  },

  startSolve: () => {
    const s = get();
    if (s.isAnimating) return;
    const moves = createScrambleMoves();
    s.reset({ keepFaceColors: true });
    set({
      pendingTimerStart: true,
      isSolved: false,
      status: { kind: "info", message: "מערבב ומתחיל סשן חדש…" },
    });
    get().enqueueMoves(moves, { recordHistory: false, source: "system" });
  },

  requestHint: async (mode = "auto") => {
    const s = get();
    if (s.isAnimating) return;
    set({ status: { kind: "loading", message: "מחשב רמז…" } });
    try {
      const useBeginner = mode === "beginner" || (mode === "auto" && s.mode === "learn");
      if (useBeginner) {
        const hint = getNextBeginnerHint(s.cube);
        const stage = hint.stage;
        set({
          hint: {
            title: stageLabelHe(stage),
            explanation: explainHe(hint.explanationKey),
            moves: hint.moves,
          },
          status: { kind: "idle" },
        });
        return;
      }

      const solution = await solveOptimal(s.facelets);
      set({
        hint: {
          title: "רמז (אופטימלי)",
          explanation: "המהלך הבא לפי פותר אופטימלי.",
          moves: solution.slice(0, 1),
        },
        status: { kind: "idle" },
      });
    } catch (e) {
      set({ status: { kind: "error", message: e instanceof Error ? e.message : String(e) } });
    }
  },

  requestSolveOptimal: async () => {
    const s = get();
    if (s.isAnimating) return;
    set({ status: { kind: "loading", message: "מחשב פתרון אופטימלי…" } });
    try {
      const solution = await solveOptimal(s.facelets);
      get().enqueueMoves(solution, { recordHistory: true, source: "system" });
      set({ status: { kind: "idle" } });
    } catch (e) {
      set({ status: { kind: "error", message: e instanceof Error ? e.message : String(e) } });
    }
  },

  requestSolveBeginner: async () => {
    const s = get();
    if (s.isAnimating) return;
    set({ status: { kind: "loading", message: "מחשב פתרון (שיטת מתחילים)…" } });
    try {
      const solution = computeBeginnerSolution(s.cube);
      if (solution.length === 0) {
        set({ status: { kind: "error", message: "לא הצלחתי לבנות פתרון מתחילים." } });
        return;
      }
      get().enqueueMoves(solution, { recordHistory: true, source: "system" });
      set({ status: { kind: "idle" } });
    } catch (e) {
      set({ status: { kind: "error", message: e instanceof Error ? e.message : String(e) } });
    }
  },

  stopMoves: () => {
    const s = get();
    if (s.queue.length === 0 && !s.isAnimating) return;
    set({
      queue: [],
      hint: null,
      status: {
        kind: "info",
        message: s.isAnimating ? "עוצר אחרי המהלך הנוכחי." : "הפתרון נעצר.",
      },
    });
  },

  loadFromFacelets: async (faceletsURFDLB, targetMode, faceColors) => {
    const solvable = isSolvable(faceletsURFDLB);
    if (!solvable.ok) {
      set({ status: { kind: "error", message: solvable.reason } });
      return;
    }

    set({ status: { kind: "loading", message: "טוען מצב קובייה…" } });
    try {
      const targetSolved = faceletsURFDLB === SOLVED_FACELETS;
      const toSolved = await solveOptimal(faceletsURFDLB);
      const fromSolved = invertAlg(toSolved);

      get().reset({ faceColors: faceColors ?? defaultFaceColors() });
      set({ mode: targetMode, isSolved: targetSolved, pendingTimerStart: false });
      get().enqueueMoves(fromSolved, { recordHistory: false, source: "system" });
      set({ status: { kind: "info", message: "הקובייה נטענה בהצלחה." } });
      setTimeout(() => {
        const current = get().status;
        if (current.kind === "info" && current.message === "הקובייה נטענה בהצלחה.") {
          set({ status: { kind: "idle" } });
        }
      }, 1500);
    } catch (e) {
      set({ status: { kind: "error", message: e instanceof Error ? e.message : String(e) } });
    }
  },

  timerToggle: () => {
    const t = get().timer;
    const now = Date.now();
    if (!t.running) {
      set({ timer: { ...t, running: true, startedAt: now }, pendingTimerStart: false });
      return;
    }
    set({
      timer: {
        running: false,
        startedAt: null,
        elapsedMs: getTimerMs(t, now),
      },
      pendingTimerStart: false,
    });
  },

  timerReset: () => set({ timer: { running: false, startedAt: null, elapsedMs: 0 }, pendingTimerStart: false }),
}));

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function explainHe(key: string): string {
  switch (key) {
    case "white_cross":
      return "מטרה: לבנות צלב לבן מיושר למרכזים.";
    case "white_corners":
      return "מטרה: להשלים את 4 הפינות של השכבה הראשונה בלי לשבור את הצלב.";
    case "middle_edges":
      return "מטרה: להכניס את קצוות השכבה השנייה למקום.";
    case "yellow_cross":
      return "מטרה: ליצור צלב צהוב (אוריינטציה של הקצוות למעלה).";
    case "yellow_corners_orient":
      return "מטרה: לסובב את הפינות הצהובות כך שצהוב יהיה למעלה.";
    case "yellow_corners_permute":
      return "מטרה: למקם את הפינות הצהובות במקום הנכון.";
    case "yellow_edges_permute":
      return "מטרה: למקם את הקצוות הצהובים ולסיים פתרון.";
    case "optimal_fallback":
      return "מצב חריג: משתמשים במהלך הבא מפתרון אופטימלי כדי לא להיתקע.";
    case "solved":
      return "הקובייה כבר פתורה.";
    default:
      return "רמז לשלב הנוכחי.";
  }
}
