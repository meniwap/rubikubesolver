declare module "cubejs" {
  type Face = "U" | "R" | "F" | "D" | "L" | "B";

  export default class Cube {
    static initSolver(): void;
    static scramble(): string;
    static fromString(facelets: string): Cube;

    center: number[];
    cp: number[];
    co: number[];
    ep: number[];
    eo: number[];

    constructor(other?: { center: number[]; cp: number[]; co: number[]; ep: number[]; eo: number[] });

    asString(): string;
    clone(): Cube;
    isSolved(): boolean;
    move(alg: string): Cube;
    solve(): string;
    upright(): string;
  }
}

