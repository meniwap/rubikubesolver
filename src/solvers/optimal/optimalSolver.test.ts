import { describe, expect, it } from "vitest";
import Cube from "cubejs";
import { solveOptimal } from "./solveOptimal";
import { formatMoves } from "../../cube/notation";

describe("optimal solver", () => {
  it("solves a scrambled cube", async () => {
    const cube = new Cube();
    cube.move("R U R' U'");
    const facelets = cube.asString();
    const sol = await solveOptimal(facelets);
    cube.move(formatMoves(sol));
    expect(cube.isSolved()).toBe(true);
  });

  it("returns a short solution when one move away", async () => {
    const cube = new Cube();
    cube.move("R");
    const sol = await solveOptimal(cube.asString());
    expect(sol.length).toBe(1);
    cube.move(formatMoves(sol));
    expect(cube.isSolved()).toBe(true);
  });

  it("returns a short solution within four moves", async () => {
    const cube = new Cube();
    cube.move("R U F L");
    const sol = await solveOptimal(cube.asString());
    expect(sol.length).toBeLessThanOrEqual(4);
    cube.move(formatMoves(sol));
    expect(cube.isSolved()).toBe(true);
  });

  it("returns a short solution within six moves", async () => {
    const cube = new Cube();
    cube.move("R U F L D B");
    const sol = await solveOptimal(cube.asString());
    expect(sol.length).toBeLessThanOrEqual(6);
    cube.move(formatMoves(sol));
    expect(cube.isSolved()).toBe(true);
  });

  it("returns a short solution within eight moves", async () => {
    const cube = new Cube();
    cube.move("R U F L D B R");
    const sol = await solveOptimal(cube.asString());
    expect(sol.length).toBeLessThanOrEqual(8);
    cube.move(formatMoves(sol));
    expect(cube.isSolved()).toBe(true);
  });
});
