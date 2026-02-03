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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">סריקת קובייה</h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={resetAll}
          >
            איפוס
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-3 text-sm text-white/80">
        טיפ: הזן/י צבעים לפי המדבקות. האוריינטציה נשמרת בדיוק כפי שהוזנה (U/R/F/D/L/B לפי המסך).
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl bg-red-500/15 p-3 text-sm">
          <div className="font-bold">שגיאות</div>
          <ul className="mt-2 list-disc pr-5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
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

          <div className="rounded-xl bg-white/5 p-3 text-sm">
            <div className="font-bold">מרכזים נוכחיים</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {FACES.map((face) => (
                <div key={face} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-sm border border-white/20" style={{ background: colorHex(centerColors[face]) }} />
                  <span className="text-white/80">{face}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex flex-wrap gap-2">
              {FACES.map((f) => (
                <button
                  key={f}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    selectedFace === f ? "bg-white/15" : "bg-white/10 hover:bg-white/15"
                  }`}
                  onClick={() => setSelectedFace(f)}
                >
                  {faceLabelHe(f)}
                </button>
              ))}
            </div>

            <div className="mt-4 grid w-fit grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, i) => {
                const idx = faceOffset + mapPreviewIndex(i, mirrorPreview);
                const c = colors[idx]!;
                return (
                  <button
                    key={`${selectedFace}-${i}`}
                    className="h-14 w-14 rounded-md border border-white/10"
                    style={{ background: colorHex(c) }}
                    onClick={() => setColors((prev) => setAt(prev, idx, selectedColor))}
                    title={`${faceLabelHe(selectedFace)} ${i + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-sm font-bold">פלטת צבעים</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {STICKER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-10 w-10 rounded-md border ${
                    selectedColor === c ? "border-white" : "border-white/10"
                  }`}
                  style={{ background: colorHex(c) }}
                  onClick={() => setSelectedColor(c)}
                  title={colorLabelHe(c)}
                />
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70">
              כיול מצלמה (מומלץ): {calibrationCount}/6 צבעים דגומים. בחר/י צבע ואז לחצ/י “דגום צבע” ליד המצלמה.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {STICKER_COLORS.map((c) => (
                <div
                  key={`${c}-calib`}
                  className={`h-6 w-6 rounded-sm border ${calibration[c] ? "border-white" : "border-white/10"}`}
                  style={{ background: colorHex(c) }}
                  title={calibration[c] ? `דגום: ${colorLabelHe(c)}` : `לא דגום: ${colorLabelHe(c)}`}
                />
              ))}
            </div>
            <button
              className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
              onClick={() => setCalibration({})}
            >
              נקה כיול
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold hover:bg-emerald-500/30"
              onClick={() => void onLoad("play")}
            >
              טען למשחק
            </button>
            <button
              className="rounded-lg bg-sky-500/20 px-3 py-2 text-sm font-semibold hover:bg-sky-500/30"
              onClick={() => void onLoad("learn")}
            >
              טען ללימוד
            </button>
          </div>

          {status.kind !== "idle" && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                status.kind === "error" ? "bg-red-500/20" : status.kind === "loading" ? "bg-white/10" : "bg-white/5"
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
