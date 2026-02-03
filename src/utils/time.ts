export function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const s = Math.floor(total / 1000);
  const m = Math.floor(s / 60);
  const remS = s % 60;
  const remMs = total % 1000;
  return `${String(m).padStart(2, "0")}:${String(remS).padStart(2, "0")}.${String(Math.floor(remMs / 10)).padStart(
    2,
    "0",
  )}`;
}
