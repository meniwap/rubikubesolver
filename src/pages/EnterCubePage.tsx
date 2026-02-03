import { useEffect, useMemo, useState } from "react";
import type { Face } from "../cube/types";
import { FACE_TO_COLOR, STICKER_COLORS, type StickerColor, toURFDLBFacelets, validateFaceletColors } from "../cube/validation";
import { useGameStore } from "../state/gameStore";
import { CameraCapture } from "../components/CameraCapture";
import { FaceletPreview } from "../components/FaceletPreview";
import type { CalibrationMap, RGB } from "../utils/colorMatch";

const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
const FACE_ORDER: Face[] = ["U", "R", "F", "D", "L", "B"];
const STORAGE_KEY = "enterCubeDraftV1";

export function EnterCubePage() {
  const loadFromFacelets = useGameStore((s) => s.loadFromFacelets);
  const status = useGameStore((s) => s.status);

  const solvedColors = useMemo(() => makeSolvedColors(), []);
  const [colors, setColors] = useState<StickerColor[]>(solvedColors);
  const [selectedFace, setSelectedFace] = useState<Face>("U");
  const [selectedColor, setSelectedColor] = useState<StickerColor>("white");
  const [errors, setErrors] = useState<string[]>([]);
  const [calibration, setCalibration] = useState<CalibrationMap>({});
  const [mirrorPreview, setMirrorPreview] = useState(false);

  const faceOffset = faceIndexOffset(selectedFace);
  const centerColors = useMemo<Record<Face, StickerColor>>(
    () => ({
      U: colors[4]!,
      R: colors[13]!,
      F: colors[22]!,
      D: colors[31]!,
      L: colors[40]!,
      B: colors[49]!,
    }),
    [colors],
  );
  const nextFace = nextFaceFor(selectedFace);
  const calibrationCount = useMemo(
    () => STICKER_COLORS.filter((c) => Boolean(calibration[c])).length,
    [calibration],
  );

  const onLoad = async (mode: "play" | "learn") => {
    const validation = validateFaceletColors(colors);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    const facelets = toURFDLBFacelets(colors);
    await loadFromFacelets(facelets, mode, centerColors);
  };

  const handleCapture = (faceColors: StickerColor[]) => {
    if (faceColors.length !== 9) return;
    setColors((prev) => applyFaceColors(prev, selectedFace, faceColors));
  };

  const handleSampleColor = (rgb: RGB) => {
    setCalibration((prev) => ({ ...prev, [selectedColor]: rgb }));
  };

  const resetAll = () => {
    setColors(makeSolvedColors());
    setSelectedFace("U");
    setSelectedColor("white");
    setCalibration({});
    setMirrorPreview(false);
    setErrors([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        colors?: StickerColor[];
        selectedFace?: Face;
        selectedColor?: StickerColor;
        calibration?: CalibrationMap;
        mirrorPreview?: boolean;
      };
      if (Array.isArray(parsed.colors) && parsed.colors.length === 54) {
        setColors(parsed.colors);
      }
      if (parsed.selectedFace && FACES.includes(parsed.selectedFace)) setSelectedFace(parsed.selectedFace);
      if (parsed.selectedColor && STICKER_COLORS.includes(parsed.selectedColor)) setSelectedColor(parsed.selectedColor);
      if (parsed.calibration && typeof parsed.calibration === "object") setCalibration(parsed.calibration);
      if (typeof parsed.mirrorPreview === "boolean") setMirrorPreview(parsed.mirrorPreview);
    } catch {
      // ignore malformed draft
    }
  }, []);

  useEffect(() => {
    try {
      const payload = {
        colors,
        selectedFace,
        selectedColor,
        calibration,
        mirrorPreview,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [colors, selectedFace, selectedColor, calibration, mirrorPreview]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="page-title">סריקת קובייה</h1>
        </div>
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={resetAll}
        >
          <ResetIcon />
          איפוס
        </button>
      </div>

      {/* Tip Card */}
      <div className="glass-card flex items-start gap-3 p-4">
        <div className="rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-2">
          <TipIcon />
        </div>
        <div>
          <h3 className="font-semibold">טיפ</h3>
          <p className="mt-1 text-sm text-white/60">
            הזן/י צבעים לפי המדבקות. האוריינטציה נשמרת בדיוק כפי שהוזנה (U/R/F/D/L/B לפי המסך).
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="status-error animate-fade-in">
          <div className="flex items-center gap-2 font-bold">
            <ErrorIcon />
            שגיאות
          </div>
          <ul className="mt-2 list-disc pr-5 text-sm">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Left Column - Camera & Preview */}
        <div className="flex flex-col gap-4">
          <CameraCapture
            activeFace={selectedFace}
            activeFaceLabel={faceLabelHe(selectedFace)}
            nextFaceLabel={faceLabelHe(nextFace)}
            onCapture={handleCapture}
            onNextFace={() => setSelectedFace(nextFace)}
            calibration={calibration}
            sampleLabel={colorLabelHe(selectedColor)}
            onSampleColor={handleSampleColor}
            previewMirror={mirrorPreview}
            onTogglePreviewMirror={() => setMirrorPreview((v) => !v)}
          />

          <FaceletPreview colors={colors} />

          {/* Current Centers */}
          <div className="glass-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">
              מרכזים נוכחיים
            </div>
            <div className="flex flex-wrap gap-3">
              {FACES.map((face) => (
                <div key={face} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <div
                    className="h-5 w-5 rounded-md border border-white/20 shadow-sm"
                    style={{ background: colorHex(centerColors[face]) }}
                  />
                  <span className="text-sm font-medium text-white/80">{face}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Face Editor */}
          <div className="glass-card p-4">
            {/* Face Tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {FACES.map((f) => (
                <button
                  key={f}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    selectedFace === f
                      ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setSelectedFace(f)}
                >
                  {faceLabelHe(f)}
                </button>
              ))}
            </div>

            {/* Face Grid */}
            <div className="flex justify-center">
              <div className="grid w-fit grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => {
                  const idx = faceOffset + mapPreviewIndex(i, mirrorPreview);
                  const c = colors[idx]!;
                  const isCenter = i === 4;
                  return (
                    <button
                      key={`${selectedFace}-${i}`}
                      className={`h-14 w-14 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 sm:h-16 sm:w-16 ${
                        isCenter
                          ? "border-white/30 ring-2 ring-white/20"
                          : "border-white/10 hover:border-white/20"
                      }`}
                      style={{ background: colorHex(c) }}
                      onClick={() => setColors((prev) => setAt(prev, idx, selectedColor))}
                      title={`${faceLabelHe(selectedFace)} ${i + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Color Palette & Actions */}
        <div className="flex flex-col gap-4">
          {/* Color Palette */}
          <div className="glass-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">
              פלטת צבעים
            </div>
            <div className="flex flex-wrap gap-3">
              {STICKER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-12 w-12 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                    selectedColor === c
                      ? "border-white shadow-lg ring-2 ring-white/30"
                      : "border-white/10 hover:border-white/30"
                  }`}
                  style={{ background: colorHex(c) }}
                  onClick={() => setSelectedColor(c)}
                  title={colorLabelHe(c)}
                />
              ))}
            </div>

            {/* Calibration Section */}
            <div className="mt-4 rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">כיול מצלמה</div>
                  <div className="text-xs text-white/50">
                    {calibrationCount}/6 צבעים דגומים
                  </div>
                </div>
                <button
                  className="btn-ghost text-xs"
                  onClick={() => setCalibration({})}
                >
                  נקה כיול
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STICKER_COLORS.map((c) => (
                  <div
                    key={`${c}-calib`}
                    className={`h-7 w-7 rounded-lg border-2 transition-all ${
                      calibration[c] ? "border-emerald-400 shadow-emerald-400/20 shadow-lg" : "border-white/10"
                    }`}
                    style={{ background: colorHex(c) }}
                    title={calibration[c] ? `דגום: ${colorLabelHe(c)}` : `לא דגום: ${colorLabelHe(c)}`}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-white/40">
                בחר/י צבע ואז לחצ/י "דגום צבע" ליד המצלמה.
              </p>
            </div>
          </div>

          {/* Load Actions */}
          <div className="glass-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">
              טען קובייה
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="btn-success flex items-center justify-center gap-2 py-3"
                onClick={() => void onLoad("play")}
              >
                <GameIcon />
                טען למשחק
              </button>
              <button
                className="btn-info flex items-center justify-center gap-2 py-3"
                onClick={() => void onLoad("learn")}
              >
                <LearnIcon />
                טען ללימוד
              </button>
            </div>
          </div>

          {/* Status Message */}
          {status.kind !== "idle" && (
            <div
              className={`animate-fade-in ${
                status.kind === "error"
                  ? "status-error"
                  : status.kind === "loading"
                  ? "status-loading"
                  : "status-info"
              }`}
            >
              {"message" in status ? status.message : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function setAt<T>(arr: T[], idx: number, value: T): T[] {
  const next = [...arr];
  next[idx] = value;
  return next;
}

function applyFaceColors(colors: StickerColor[], face: Face, faceColors: StickerColor[]): StickerColor[] {
  const next = [...colors];
  const offset = faceIndexOffset(face);
  for (let i = 0; i < 9; i++) {
    next[offset + i] = faceColors[i] ?? next[offset + i]!;
  }
  return next;
}

function nextFaceFor(face: Face): Face {
  const idx = FACE_ORDER.indexOf(face);
  if (idx === -1) return "U";
  return FACE_ORDER[(idx + 1) % FACE_ORDER.length]!;
}

function mapPreviewIndex(i: number, mirror: boolean): number {
  if (!mirror) return i;
  const row = Math.floor(i / 3);
  const col = i % 3;
  const mirroredCol = 2 - col;
  return row * 3 + mirroredCol;
}

function faceIndexOffset(face: Face): number {
  switch (face) {
    case "U":
      return 0;
    case "R":
      return 9;
    case "F":
      return 18;
    case "D":
      return 27;
    case "L":
      return 36;
    case "B":
      return 45;
  }
}

function makeSolvedColors(): StickerColor[] {
  const out: StickerColor[] = [];
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) out.push(FACE_TO_COLOR[face]);
  }
  return out;
}

function faceLabelHe(face: Face): string {
  switch (face) {
    case "U":
      return "U (למעלה)";
    case "D":
      return "D (למטה)";
    case "F":
      return "F (קדימה)";
    case "B":
      return "B (אחורה)";
    case "R":
      return "R (ימין)";
    case "L":
      return "L (שמאל)";
  }
}

function colorLabelHe(c: StickerColor): string {
  switch (c) {
    case "white":
      return "לבן";
    case "yellow":
      return "צהוב";
    case "green":
      return "ירוק";
    case "blue":
      return "כחול";
    case "red":
      return "אדום";
    case "orange":
      return "כתום";
  }
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

// Icons
function ResetIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function TipIcon() {
  return (
    <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function GameIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function LearnIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
