export type Priority = 0 | 1 | 2 | 3;

export type Vec2 = { x: number; y: number };

export type TaskNode = {
  id: string;
  parentId: string | null;
  label: string;
  checked: boolean;
  priority: Priority;
  notes: string;
  images: string[];
  notesOpen: boolean;
  isCategory: boolean;
};

export type Connection = {
  id: string;
  from: string;
  to: string;
};

export type MindmapState = {
  nodes: TaskNode[];
  positions: Record<string, Vec2>;
  connections: Connection[];
};

export type ViewportState = { panX: number; panY: number; scale: number };

export const WORLD_W = 4000;
export const WORLD_H = 4000;
export const WORLD_CX = 2000;
export const WORLD_CY = 2000;

export const DEFAULT_VIEWPORT: ViewportState = {
  panX: -1560,
  panY: -1640,
  scale: 1,
};

/** P0 (right) = highest → P3 (left) = lowest; bar fills from the left. */
export const PRIORITY_COLORS = [
  "#e0453a",
  "#f0a82e",
  "#949bff",
  "#d4dcc8",
] as const;

export const PRIORITY_LABELS = ["Critical", "High", "Medium", "Low"] as const;

export const PRIORITY_CODES = ["P0", "P1", "P2", "P3"] as const;

export const DEFAULT_STATE: MindmapState = {
  nodes: [
    {
      id: "cat-1",
      parentId: null,
      label: "",
      checked: false,
      priority: 3,
      notes: "",
      images: [],
      notesOpen: false,
      isCategory: true,
    },
    {
      id: "task-1",
      parentId: "cat-1",
      label: "",
      checked: false,
      priority: 0,
      notes: "",
      images: [],
      notesOpen: false,
      isCategory: false,
    },
    {
      id: "task-2",
      parentId: "cat-1",
      label: "",
      checked: false,
      priority: 2,
      notes: "",
      images: [],
      notesOpen: false,
      isCategory: false,
    },
  ],
  positions: {
    "cat-1": { x: WORLD_CX, y: WORLD_CY },
    "task-1": { x: WORLD_CX + 280, y: WORLD_CY },
    "task-2": { x: WORLD_CX - 280, y: WORLD_CY },
  },
  connections: [
    { id: "conn-1", from: "cat-1", to: "task-1" },
    { id: "conn-2", from: "cat-1", to: "task-2" },
  ],
};

export function uid() {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Filled segments from the left; P0 = four, P3 = one. */
export function fillCount(priority: Priority) {
  return 4 - priority;
}

export function radialPosition(
  index: number,
  total: number,
  cx: number,
  cy: number,
  radius: number,
): Vec2 {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}
