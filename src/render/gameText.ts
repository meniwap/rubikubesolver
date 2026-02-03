import { moveToToken } from "../cube/notation";
import { useGameStore } from "../state/gameStore";
import { formatMs } from "../utils/time";
import { getVisualFacelets } from "./visualFacelets";

function getTimerMs() {
  const { timer } = useGameStore.getState();
  const now = Date.now();
  return timer.elapsedMs + (timer.running && timer.startedAt ? now - timer.startedAt : 0);
}

export function registerGameText() {
  if (typeof window === "undefined") return;

  window.render_game_to_text = () => {
    const s = useGameStore.getState();
    const timerMs = getTimerMs();
    const currentMove = s.current ? moveToToken(s.current.move) : null;
    const nextHintMove = s.hint?.moves[0] ? moveToToken(s.hint.moves[0]) : null;
    const debug = import.meta.env.DEV || import.meta.env.MODE === "test";
    const visualFacelets = debug ? getVisualFacelets() : null;
    const visualMismatch = debug ? (visualFacelets ? visualFacelets !== s.facelets : null) : null;

    const payload = {
      mode: s.mode,
      facelets: s.facelets,
      faceletOrder: "URFDLB",
      isSolved: s.isSolved,
      isAnimating: s.isAnimating,
      queueLength: s.queue.length,
      pendingTimerStart: s.pendingTimerStart,
      currentMove,
      historyLength: s.history.length,
      timer: {
        running: s.timer.running,
        elapsedMs: timerMs,
        display: formatMs(timerMs),
      },
      status: s.status,
      hint: s.hint ? { title: s.hint.title, nextMove: nextHintMove } : null,
      stats: s.stats,
      faceColors: s.faceColors,
      note: "Facelets are cubejs URFDLB; faceColors may override default scheme.",
      ...(debug ? { visualFacelets, visualMismatch } : {}),
    };

    return JSON.stringify(payload);
  };

  if (typeof window.advanceTime !== "function") {
    window.advanceTime = (ms: number) =>
      new Promise<void>((resolve) => {
        const start = performance.now();
        const step = (now: number) => {
          if (now - start >= ms) return resolve();
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
  }
}
