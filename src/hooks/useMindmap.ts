import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { oppositeSide, sideToward, type Side } from "../geometry";
import {
  DEFAULT_STATE,
  DEFAULT_VIEWPORT,
  type Connection,
  type MindmapState,
  type TaskNode,
  type Vec2,
  type ViewportState,
  WORLD_CX,
  WORLD_CY,
  radialPosition,
  uid,
} from "../types";
import {
  PRIORITY_SCALE,
  parsePersistedMindmap,
  readRawMindmapStorage,
  saveMindmapState,
  type SaveStatus,
} from "../persistence";

const MAX_UNDO = 50;

type UndoSnapshot = {
  mindmap: MindmapState;
  selectedCategoryId: string | null;
};

function cloneMindmap(state: MindmapState): MindmapState {
  return {
    nodes: state.nodes.map((n) => ({
      ...n,
      images: [...n.images],
    })),
    positions: { ...state.positions },
    connections: state.connections.map((c) => ({ ...c })),
  };
}

function connectionsFromParents(nodes: TaskNode[]): Connection[] {
  return nodes
    .filter((n) => !n.isCategory && n.parentId)
    .map((n) => ({
      id: uid(),
      from: n.parentId!,
      to: n.id,
    }));
}

function loadState(): {
  mindmap: MindmapState;
  viewport: ViewportState;
  selectedCategoryId: string | null;
  listOpen: boolean;
} {
  const raw = readRawMindmapStorage();
  if (!raw) {
    return {
      mindmap: DEFAULT_STATE,
      viewport: DEFAULT_VIEWPORT,
      selectedCategoryId: "cat-1",
      listOpen: false,
    };
  }

  const parsed = parsePersistedMindmap(raw, {
    nodes: DEFAULT_STATE.nodes,
    positions: DEFAULT_STATE.positions,
    connections: DEFAULT_STATE.connections,
  });

  if (!parsed) {
    return {
      mindmap: DEFAULT_STATE,
      viewport: DEFAULT_VIEWPORT,
      selectedCategoryId: "cat-1",
      listOpen: false,
    };
  }

  const mindmap: MindmapState = {
    nodes: parsed.nodes,
    positions: parsed.positions,
    connections:
      parsed.connections.length > 0
        ? parsed.connections
        : connectionsFromParents(parsed.nodes),
  };
  const categories = mindmap.nodes.filter((n) => n.isCategory);
  const selected =
    parsed.selectedCategoryId &&
    categories.some((c) => c.id === parsed.selectedCategoryId)
      ? parsed.selectedCategoryId
      : (categories[0]?.id ?? null);

  return {
    mindmap,
    viewport: parsed.viewport,
    selectedCategoryId: selected,
    listOpen: parsed.listOpen ?? false,
  };
}

export function useMindmap() {
  const initial = loadState();
  const [mindmap, setMindmap] = useState<MindmapState>(initial.mindmap);
  const [viewport, setViewport] = useState<ViewportState>(initial.viewport);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initial.selectedCategoryId,
  );
  const [listOpen, setListOpen] = useState(initial.listOpen);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const mindmapRef = useRef(mindmap);
  const viewportRef = useRef(viewport);
  const selectedCategoryRef = useRef(selectedCategoryId);
  const listOpenRef = useRef(listOpen);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mindmapRef.current = mindmap;
  }, [mindmap]);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    listOpenRef.current = listOpen;
  }, [listOpen]);

  const flushSave = useCallback(() => {
    const status = saveMindmapState({
      ...mindmapRef.current,
      viewport: viewportRef.current,
      selectedCategoryId: selectedCategoryRef.current,
      priorityScale: PRIORITY_SCALE,
      listOpen: listOpenRef.current,
    });
    setSaveStatus(status);
    return status;
  }, []);

  const recordUndo = useCallback(() => {
    undoStackRef.current.push({
      mindmap: cloneMindmap(mindmapRef.current),
      selectedCategoryId: selectedCategoryRef.current,
    });
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
  }, []);

  const undo = useCallback((): UndoSnapshot | null => {
    const snap = undoStackRef.current.pop();
    if (!snap) return null;
    setMindmap(snap.mindmap);
    setSelectedCategoryId(snap.selectedCategoryId);
    return snap;
  }, []);

  const categories = mindmap.nodes.filter((n) => n.isCategory);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  useEffect(() => {
    if (
      selectedCategoryId &&
      !categories.some((c) => c.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(categories[0]?.id ?? null);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave();
      saveTimerRef.current = null;
    }, 350);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [mindmap, viewport, selectedCategoryId, listOpen, flushSave]);

  useEffect(() => {
    const onPageHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    const onUnload = () => flushSave();
    window.addEventListener("visibilitychange", onPageHide);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("visibilitychange", onPageHide);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [flushSave]);

  useEffect(() => {
    if (saveStatus === "idle") return;
    const timer = setTimeout(() => setSaveStatus("idle"), 2800);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  const positions = useMemo(() => {
    const merged = { ...(mindmap.positions ?? {}) };
    categories.forEach((cat, catIndex) => {
      if (!merged[cat.id]) {
        merged[cat.id] = radialPosition(
          catIndex,
          Math.max(categories.length, 1),
          WORLD_CX,
          WORLD_CY,
          categories.length > 1 ? 320 : 0,
        );
      }
      const tasks = mindmap.nodes.filter(
        (n) => !n.isCategory && n.parentId === cat.id,
      );
      tasks.forEach((task, i) => {
        if (!merged[task.id]) {
          merged[task.id] = radialPosition(
            i,
            tasks.length,
            merged[cat.id].x,
            merged[cat.id].y,
            220,
          );
        }
      });
    });
    return merged;
  }, [mindmap.positions, mindmap.nodes, categories]);

  const updateNode = useCallback((id: string, patch: Partial<TaskNode>) => {
    setMindmap((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  }, []);

  const setPosition = useCallback((id: string, pos: Vec2) => {
    setMindmap((prev) => ({
      ...prev,
      positions: { ...prev.positions, [id]: pos },
    }));
  }, []);

  const addConnection = useCallback(
    (from: string, to: string, fromSide?: Side, toSide?: Side) => {
      if (from === to) return;
      setMindmap((prev) => {
        const exists = prev.connections.some(
          (c) => c.from === from && c.to === to,
        );
        if (exists) return prev;
        return {
          ...prev,
          connections: [
            ...prev.connections,
            { id: uid(), from, to },
          ],
        };
      });
      void fromSide;
      void toSide;
    },
    [],
  );

  const removeConnection = useCallback((connectionId: string) => {
    recordUndo();
    setMindmap((prev) => {
      const conn = prev.connections.find((c) => c.id === connectionId);
      if (!conn) return prev;
      const nodes = prev.nodes.map((n) =>
        n.id === conn.to && n.parentId === conn.from
          ? { ...n, parentId: null }
          : n,
      );
      return {
        ...prev,
        nodes,
        connections: prev.connections.filter((c) => c.id !== connectionId),
      };
    });
  }, [recordUndo]);

  const findConnection = useCallback((fromId: string, toId: string) => {
    return mindmap.connections.find(
      (c) =>
        (c.from === fromId && c.to === toId) ||
        (c.from === toId && c.to === fromId),
    );
  }, [mindmap.connections]);

  const deleteNode = useCallback(
    (id: string) => {
      recordUndo();
      setMindmap((prev) => {
        const nextPositions = { ...prev.positions };
        delete nextPositions[id];
        return {
          positions: nextPositions,
          nodes: prev.nodes.filter(
            (n) => n.id !== id && n.parentId !== id,
          ),
          connections: prev.connections.filter(
            (c) => c.from !== id && c.to !== id,
          ),
        };
      });
      if (selectedCategoryId === id) {
        const remaining = mindmap.nodes.filter(
          (n) => n.isCategory && n.id !== id,
        );
        setSelectedCategoryId(remaining[0]?.id ?? null);
      }
    },
    [recordUndo, mindmap.nodes, selectedCategoryId],
  );

  const addCategory = useCallback(() => {
    recordUndo();
    const id = uid();
    const count = categories.length;
    const pos = radialPosition(count, count + 1, WORLD_CX, WORLD_CY, 360);
    setMindmap((prev) => ({
      nodes: [
        ...prev.nodes,
        {
          id,
          parentId: null,
          label: "",
          checked: false,
          priority: 3,
          notes: "",
          images: [],
          notesOpen: false,
          isCategory: true,
        },
      ],
      positions: { ...prev.positions, [id]: pos },
      connections: prev.connections,
    }));
    setSelectedCategoryId(id);
  }, [categories.length, recordUndo]);

  const addTask = useCallback(
    (categoryId?: string) => {
      recordUndo();
      const catId = categoryId ?? selectedCategoryId;
      if (!catId) return;
      const cat = mindmap.nodes.find((n) => n.id === catId);
      if (!cat?.isCategory) return;
      const id = uid();
      const catPos = positions[cat.id] ?? { x: WORLD_CX, y: WORLD_CY };
      const siblingCount = mindmap.nodes.filter(
        (n) => !n.isCategory && n.parentId === cat.id,
      ).length;
      const pos = radialPosition(
        siblingCount,
        siblingCount + 1,
        catPos.x,
        catPos.y,
        240,
      );
      setMindmap((prev) => ({
        nodes: [
          ...prev.nodes,
          {
            id,
            parentId: cat.id,
            label: "",
            checked: false,
            priority: 3,
            notes: "",
            images: [],
            notesOpen: false,
            isCategory: false,
          },
        ],
        positions: { ...prev.positions, [id]: pos },
        connections: [
          ...prev.connections,
          { id: uid(), from: cat.id, to: id },
        ],
      }));
    },
    [mindmap.nodes, positions, recordUndo, selectedCategoryId],
  );

  const addTaskAt = useCallback(
    (pos: Vec2, categoryId?: string) => {
      recordUndo();
      const catId = categoryId ?? selectedCategoryId;
      if (!catId) return;
      const cat = mindmap.nodes.find((n) => n.id === catId);
      if (!cat?.isCategory) return;
      const id = uid();
      setMindmap((prev) => ({
        nodes: [
          ...prev.nodes,
          {
            id,
            parentId: cat.id,
            label: "",
            checked: false,
            priority: 3,
            notes: "",
            images: [],
            notesOpen: false,
            isCategory: false,
          },
        ],
        positions: { ...prev.positions, [id]: pos },
        connections: [
          ...prev.connections,
          { id: uid(), from: cat.id, to: id },
        ],
      }));
    },
    [mindmap.nodes, recordUndo, selectedCategoryId],
  );

  const resetView = useCallback(() => setViewport(DEFAULT_VIEWPORT), []);

  const selectCategory = useCallback((id: string) => {
    setSelectedCategoryId(id);
  }, []);

  const focusNode = useCallback(
    (nodeId: string) => {
      const node = mindmap.nodes.find((n) => n.id === nodeId);
      const pos = positions[nodeId];
      if (!node || !pos) return;
      if (node.isCategory) setSelectedCategoryId(nodeId);
      const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 400;
      const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 300;
      setViewport((v) => ({
        ...v,
        panX: cx - pos.x * v.scale,
        panY: cy - pos.y * v.scale,
      }));
    },
    [mindmap.nodes, positions],
  );

  const connectNodes = useCallback(
    (fromId: string, toId: string, fromSide: Side, toSide?: Side) => {
      const fromNode = mindmap.nodes.find((n) => n.id === fromId);
      const toNode = mindmap.nodes.find((n) => n.id === toId);
      if (!fromNode || !toNode) return;
      const fromPos = positions[fromId];
      const toPos = positions[toId];
      if (!fromPos || !toPos) return;
      const resolvedToSide =
        toSide ?? oppositeSide(sideToward(fromPos, toPos));
      recordUndo();
      addConnection(fromId, toId, fromSide, resolvedToSide);
    },
    [mindmap.nodes, positions, addConnection, recordUndo],
  );

  const spawnConnectedNode = useCallback(
    (fromId: string, at: Vec2) => {
      const fromNode = mindmap.nodes.find((n) => n.id === fromId);
      if (!fromNode) return;
      recordUndo();
      const id = uid();
      setMindmap((prev) => ({
        nodes: [
          ...prev.nodes,
          {
            id,
            parentId: fromNode.isCategory ? fromId : null,
            label: "",
            checked: false,
            priority: 3,
            notes: "",
            images: [],
            notesOpen: false,
            isCategory: false,
          },
        ],
        positions: { ...prev.positions, [id]: at },
        connections: [
          ...prev.connections,
          { id: uid(), from: fromId, to: id },
        ],
      }));
    },
    [mindmap.nodes, recordUndo],
  );

  return {
    mindmap,
    viewport,
    setViewport,
    categories,
    selectedCategory,
    selectedCategoryId,
    selectCategory,
    positions,
    updateNode,
    setPosition,
    deleteNode,
    addCategory,
    addTask,
    addTaskAt,
    resetView,
    connectNodes,
    removeConnection,
    findConnection,
    spawnConnectedNode,
    focusNode,
    undo,
    listOpen,
    setListOpen,
    saveStatus,
  };
}
