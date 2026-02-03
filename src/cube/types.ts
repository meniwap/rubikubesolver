export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type TurnAmount = 1 | -1 | 2;

export type Move = {
  face: Face;
  amount: TurnAmount;
};

export type Alg = Move[];

export const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];

