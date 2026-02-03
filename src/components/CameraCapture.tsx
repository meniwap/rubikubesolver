import { useEffect, useRef, useState } from "react";
import type { StickerColor } from "../cube/validation";
import type { Face } from "../cube/types";
import { matchStickerColor, type CalibrationMap, type RGB } from "../utils/colorMatch";

const OVERLAY_SCALE = 0.6;

export function CameraCapture(props: {
  activeFace: Face;
  activeFaceLabel: string;
  nextFaceLabel: string;
  onCapture: (colors: StickerColor[]) => void;
  onNextFace: () => void;
  calibration?: CalibrationMap;
  sampleLabel?: string;
  onSampleColor?: (rgb: RGB) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [mirror, setMirror] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<StickerColor[] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return () => stopStream();
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopStream();
      setReady(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("הדפדפן לא תומך במצלמה.");
      setEnabled(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stopStream();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setEnabled(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, facingMode]);

  const captureFace = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("המצלמה עדיין לא מוכנה לצילום.");
      return;
    }
    const colors = sampleFaceColors(video, OVERLAY_SCALE, props.calibration, mirror);
    if (colors.length === 9) {
      setLastCapture(colors);
      props.onCapture(colors);
    }
  };

  const sampleColor = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("המצלמה עדיין לא מוכנה לצילום.");
      return;
    }
    const rgb = sampleCenterColor(video, OVERLAY_SCALE);
    if (rgb && props.onSampleColor) {
      props.onSampleColor(rgb);
    }
  };

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold">Camera Capture</div>
          <div className="text-xs text-white/70">פאה נוכחית: {props.activeFaceLabel}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={() => setEnabled((v) => !v)}
          >
            {enabled ? "כבה מצלמה" : "הפעל מצלמה"}
          </button>
          <button
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
            disabled={!enabled}
            onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          >
            החלף מצלמה
          </button>
          <button
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={() => setMirror((v) => !v)}
          >
            {mirror ? "תצוגת מראה: כן" : "תצוגת מראה: לא"}
          </button>
        </div>
      </div>

      <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-lg bg-black/40">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ transform: mirror ? "scaleX(-1)" : "none" }}
          playsInline
          muted
          onLoadedMetadata={() => setReady(true)}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: `${OVERLAY_SCALE * 100}%`, aspectRatio: "1" }}>
            <div className="absolute inset-0 rounded-md border border-white/50" />
            <div className="absolute left-1/3 top-0 h-full w-px bg-white/40" />
            <div className="absolute left-2/3 top-0 h-full w-px bg-white/40" />
            <div className="absolute top-1/3 h-px w-full bg-white/40" />
            <div className="absolute top-2/3 h-px w-full bg-white/40" />
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-white/60">
        טיפ: אם “תצוגת צילום אחרונה” נראית הפוכה יחסית למצלמה, הפעילו תצוגת מראה. שמרו על אותה אוריינטציה לכל
        הפאות (U/R/F/D/L/B לפי התצוגה) כדי למנוע טעויות.
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50"
          disabled={!enabled || !ready}
          onClick={captureFace}
        >
          Capture Face
        </button>
        {props.onSampleColor && (
          <button
            className="rounded-lg bg-sky-500/20 px-3 py-2 text-sm font-semibold hover:bg-sky-500/30 disabled:opacity-50"
            disabled={!enabled || !ready}
            onClick={sampleColor}
          >
            דגום צבע {props.sampleLabel ? `(${props.sampleLabel})` : ""}
          </button>
        )}
        {lastCapture && (
          <button
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={captureFace}
          >
            Retake
          </button>
        )}
        <button
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
          onClick={props.onNextFace}
        >
          Next Face ({props.nextFaceLabel})
        </button>
      </div>

      {error && <div className="mt-2 text-xs text-red-300">שגיאת מצלמה: {error}</div>}

      {lastCapture && (
        <div className="mt-3">
          <div className="text-xs text-white/70">תצוגת צילום אחרונה:</div>
          <div className="mt-2 grid w-fit grid-cols-3 gap-1">
            {lastCapture.map((c, i) => (
              <div key={i} className="h-6 w-6 rounded-sm border border-white/10" style={{ background: colorHex(c) }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function sampleFaceColors(
  video: HTMLVideoElement,
  scale: number,
  calibration?: CalibrationMap,
  mirror?: boolean,
): StickerColor[] {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(video, 0, 0, width, height);

  const size = Math.min(width, height) * scale;
  const startX = (width - size) / 2;
  const startY = (height - size) / 2;
  const cell = size / 3;
  const colors: StickerColor[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sampleCol = mirror ? 2 - col : col;
      const cx = Math.round(startX + (sampleCol + 0.5) * cell);
      const cy = Math.round(startY + (row + 0.5) * cell);
      const rgb = sampleAverage(ctx, cx, cy, Math.max(3, Math.round(cell * 0.1)));
      colors.push(matchStickerColor(rgb, calibration));
    }
  }

  return colors;
}

function sampleCenterColor(video: HTMLVideoElement, scale: number): RGB | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);

  const size = Math.min(width, height) * scale;
  const startX = (width - size) / 2;
  const startY = (height - size) / 2;
  const cell = size / 3;
  const cx = Math.round(startX + 1.5 * cell);
  const cy = Math.round(startY + 1.5 * cell);
  return sampleAverage(ctx, cx, cy, Math.max(3, Math.round(cell * 0.14)));
}

function sampleAverage(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  const size = radius * 2 + 1;
  const startX = Math.max(0, x - radius);
  const startY = Math.max(0, y - radius);
  const img = ctx.getImageData(startX, startY, size, size).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < img.length; i += 4) {
    r += img[i]!;
    g += img[i + 1]!;
    b += img[i + 2]!;
    count += 1;
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

function colorHex(c: StickerColor): string {
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
  }
}
