import type { TaskNode, Vec2 } from "./types";

export type Side = "n" | "s" | "e" | "w";

export function nodeSize(
  node: Pick<TaskNode, "isCategory" | "notesOpen"> & { checked?: boolean },
) {
  if (node.isCategory) return { w: 212, h: 48 };
  if (node.notesOpen) return { w: 252, h: 192 };
  if (node.checked) return { w: 252, h: 48 };
  return { w: 252, h: 76 };
}

export function anchorAt(
  center: Vec2,
  node: Pick<TaskNode, "isCategory" | "notesOpen">,
  side: Side,
): Vec2 {
  const { w, h } = nodeSize(node);
  const { x, y } = center;
  switch (side) {
    case "n":
      return { x, y: y - h / 2 };
    case "s":
      return { x, y: y + h / 2 };
    case "e":
      return { x: x + w / 2, y };
    case "w":
      return { x: x - w / 2, y };
  }
}

export function sideToward(from: Vec2, to: Vec2): Side {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "e" : "w";
  return dy >= 0 ? "s" : "n";
}

const OPPOSITE: Record<Side, Side> = { n: "s", s: "n", e: "w", w: "e" };

export function oppositeSide(side: Side): Side {
  return OPPOSITE[side];
}
