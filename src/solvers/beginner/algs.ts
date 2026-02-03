export const ALGS = {
  // Middle edges
  middleRight: "U R U' R' U' F' U F",
  middleLeft: "U' L' U L U F U' F'",

  // Yellow cross
  yellowCross: "F R U R' U' F'",

  // OLL corners
  sune: "R U R' U R U2 R'",
  antiSune: "R' U' R U' R' U2 R",

  // PLL corners (Niklas)
  niklas: "U R U' L' U R' U' L",

  // PLL edges
  ua: "R U' R U R U R U' R' U' R2",
  ub: "R2 U R U R' U' R' U' R' U R'",
} as const;

