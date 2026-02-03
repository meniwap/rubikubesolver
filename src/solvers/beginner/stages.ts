import type Cube from "cubejs";

export const Stage = {
  WhiteCross: "white_cross",
  WhiteCorners: "white_corners",
  MiddleEdges: "middle_edges",
  YellowCross: "yellow_cross",
  YellowCornersOrient: "yellow_corners_orient",
  YellowCornersPermute: "yellow_corners_permute",
  YellowEdgesPermute: "yellow_edges_permute",
  Solved: "solved",
} as const;

export type Stage = (typeof Stage)[keyof typeof Stage];

export function stageLabelHe(stage: Stage): string {
  switch (stage) {
    case Stage.WhiteCross:
      return "צלב לבן";
    case Stage.WhiteCorners:
      return "פינות שכבה ראשונה";
    case Stage.MiddleEdges:
      return "שכבה שנייה (קצוות)";
    case Stage.YellowCross:
      return "צלב צהוב";
    case Stage.YellowCornersOrient:
      return "אוריינטציה פינות צהובות";
    case Stage.YellowCornersPermute:
      return "מיקום פינות צהובות";
    case Stage.YellowEdgesPermute:
      return "מיקום קצוות צהובים";
    case Stage.Solved:
      return "פתור";
  }
}

export function isStageComplete(cube: Cube, stage: Stage): boolean {
  switch (stage) {
    case Stage.WhiteCross:
      return isWhiteCrossSolved(cube);
    case Stage.WhiteCorners:
      return isWhiteCrossSolved(cube) && areWhiteCornersSolved(cube);
    case Stage.MiddleEdges:
      return isWhiteCrossSolved(cube) && areWhiteCornersSolved(cube) && areMiddleEdgesSolved(cube);
    case Stage.YellowCross:
      return (
        isWhiteCrossSolved(cube) &&
        areWhiteCornersSolved(cube) &&
        areMiddleEdgesSolved(cube) &&
        areUEdgesOriented(cube)
      );
    case Stage.YellowCornersOrient:
      return isStageComplete(cube, Stage.YellowCross) && areUCornersOriented(cube);
    case Stage.YellowCornersPermute:
      return isStageComplete(cube, Stage.YellowCornersOrient) && areUCornersPermuted(cube);
    case Stage.YellowEdgesPermute:
      return cube.isSolved();
    case Stage.Solved:
      return cube.isSolved();
  }
}

export function getCurrentStage(cube: Cube): Stage {
  if (!isWhiteCrossSolved(cube)) return Stage.WhiteCross;
  if (!areWhiteCornersSolved(cube)) return Stage.WhiteCorners;
  if (!areMiddleEdgesSolved(cube)) return Stage.MiddleEdges;
  if (!areUEdgesOriented(cube)) return Stage.YellowCross;
  if (!areUCornersOriented(cube)) return Stage.YellowCornersOrient;
  if (!areUCornersPermuted(cube)) return Stage.YellowCornersPermute;
  if (!cube.isSolved()) return Stage.YellowEdgesPermute;
  return Stage.Solved;
}

function isWhiteCrossSolved(cube: Cube): boolean {
  for (const pos of [4, 5, 6, 7]) {
    if (cube.ep[pos] !== pos) return false;
    if (cube.eo[pos] !== 0) return false;
  }
  return true;
}

function areWhiteCornersSolved(cube: Cube): boolean {
  for (const pos of [4, 5, 6, 7]) {
    if (cube.cp[pos] !== pos) return false;
    if (cube.co[pos] !== 0) return false;
  }
  return true;
}

function areMiddleEdgesSolved(cube: Cube): boolean {
  for (const pos of [8, 9, 10, 11]) {
    if (cube.ep[pos] !== pos) return false;
    if (cube.eo[pos] !== 0) return false;
  }
  return true;
}

function areUEdgesOriented(cube: Cube): boolean {
  for (const pos of [0, 1, 2, 3]) {
    if (cube.eo[pos] !== 0) return false;
  }
  return true;
}

function areUCornersOriented(cube: Cube): boolean {
  for (const pos of [0, 1, 2, 3]) {
    if (cube.co[pos] !== 0) return false;
  }
  return true;
}

function areUCornersPermuted(cube: Cube): boolean {
  for (const pos of [0, 1, 2, 3]) {
    if (cube.cp[pos] !== pos) return false;
  }
  return true;
}
