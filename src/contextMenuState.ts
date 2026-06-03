import type { Vec2 } from "./types";

export type ContextMenuTarget =
  | { kind: "canvas"; worldPos: Vec2 }
  | { kind: "node"; nodeId: string }
  | { kind: "edge"; connectionId: string };

export type ContextMenuState = {
  x: number;
  y: number;
  target: ContextMenuTarget;
};
