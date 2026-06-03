import {
  DEFAULT_VIEWPORT,
  type MindmapState,
  type TaskNode,
  type ViewportState,
} from "./types";
import { withDefaultScale } from "./viewport";

export const MINDMAP_STORAGE_KEY = "my-mess-mindmap-v2";
export const PRIORITY_SCALE = "p0-high";

export const LEGACY_STORAGE_KEYS = [
  "my-mess-mindmap-v1",
  "inwork-mindmap-v1",
  "branch-mindmap-v4",
] as const;

export type PersistedMindmap = MindmapState & {
  viewport: ViewportState;
  selectedCategoryId: string | null;
  priorityScale: string;
  listOpen?: boolean;
};

export type SaveStatus = "idle" | "saved" | "saved-no-images" | "error";

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function saveMindmapState(data: PersistedMindmap): SaveStatus {
  try {
    localStorage.setItem(MINDMAP_STORAGE_KEY, JSON.stringify(data));
    return "saved";
  } catch (error) {
    if (!isQuotaError(error)) return "error";

    try {
      const stripped: PersistedMindmap = {
        ...data,
        nodes: data.nodes.map((n) => ({ ...n, images: [] })),
      };
      localStorage.setItem(MINDMAP_STORAGE_KEY, JSON.stringify(stripped));
      return "saved-no-images";
    } catch {
      return "error";
    }
  }
}

export function readRawMindmapStorage(): string | null {
  try {
    return (
      localStorage.getItem(MINDMAP_STORAGE_KEY) ??
      LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(
        (value) => value != null,
      ) ??
      null
    );
  } catch {
    return null;
  }
}

export function parsePersistedMindmap(
  raw: string,
  defaults: {
    nodes: TaskNode[];
    positions: MindmapState["positions"];
    connections: MindmapState["connections"];
  },
): PersistedMindmap | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedMindmap>;
    const rawNodes: TaskNode[] = parsed.nodes ?? defaults.nodes;
    const nodes: TaskNode[] =
      parsed.priorityScale === PRIORITY_SCALE
        ? rawNodes
        : rawNodes.map((n) => ({
            ...n,
            priority: (3 - n.priority) as TaskNode["priority"],
          }));

    return {
      nodes,
      positions: parsed.positions ?? defaults.positions,
      connections:
        parsed.connections && parsed.connections.length > 0
          ? parsed.connections
          : defaults.connections,
      viewport: withDefaultScale(parsed.viewport ?? DEFAULT_VIEWPORT),
      selectedCategoryId: parsed.selectedCategoryId ?? null,
      priorityScale: parsed.priorityScale ?? PRIORITY_SCALE,
      listOpen: parsed.listOpen ?? false,
    };
  } catch {
    return null;
  }
}
