import type { ContextMenuItem } from "./components/ContextMenu";
import type { ContextMenuTarget } from "./contextMenuState";
import type { TaskNode } from "./types";

type Handlers = {
  nodes: TaskNode[];
  selectedCategoryId: string | null;
  hasCategory: boolean;
  onAddTask: () => void;
  onAddTaskAt: (worldPos: { x: number; y: number }) => void;
  onAddCategory: () => void;
  onResetView: () => void;
  onToggleList: () => void;
  onUndo: () => void;
  onFocusNode: (id: string) => void;
  onToggleChecked: (id: string, checked: boolean) => void;
  onToggleNotes: (id: string, open: boolean) => void;
  onDeleteNode: (id: string) => void;
  onAddTaskToCategory: (id: string) => void;
  onSelectCategory: (id: string) => void;
  onDisconnect: (connectionId: string) => void;
};

export function buildContextMenuItems(
  target: ContextMenuTarget,
  h: Handlers,
): ContextMenuItem[] {
  if (target.kind === "canvas") {
    return [
      {
        id: "add-here",
        label: "Add task here",
        disabled: !h.hasCategory,
        onSelect: () => h.onAddTaskAt(target.worldPos),
      },
      {
        id: "add-task",
        label: "Add task",
        disabled: !h.hasCategory,
        onSelect: h.onAddTask,
      },
      {
        id: "add-cat",
        label: "Add category",
        onSelect: h.onAddCategory,
      },
      { id: "list", label: "All items", onSelect: h.onToggleList },
      { id: "reset", label: "Reset view", onSelect: h.onResetView },
      {
        id: "undo",
        label: "Undo",
        shortcut: "⌘Z",
        onSelect: h.onUndo,
      },
    ];
  }

  if (target.kind === "edge") {
    return [
      {
        id: "disconnect",
        label: "Disconnect",
        onSelect: () => h.onDisconnect(target.connectionId),
      },
    ];
  }

  const node = h.nodes.find((n) => n.id === target.nodeId);
  if (!node) return [];

  if (node.isCategory) {
    return [
      {
        id: "select",
        label: "Select category",
        onSelect: () => h.onSelectCategory(node.id),
      },
      {
        id: "add-task",
        label: "Add task",
        onSelect: () => h.onAddTaskToCategory(node.id),
      },
      {
        id: "focus",
        label: "Center on canvas",
        onSelect: () => h.onFocusNode(node.id),
      },
      {
        id: "delete",
        label: "Delete category",
        danger: true,
        onSelect: () => h.onDeleteNode(node.id),
      },
    ];
  }

  return [
    {
      id: "focus",
      label: "Center on canvas",
      onSelect: () => h.onFocusNode(node.id),
    },
    {
      id: "notes",
      label: node.notesOpen ? "Collapse notes" : "Expand notes",
      onSelect: () => h.onToggleNotes(node.id, !node.notesOpen),
    },
    {
      id: "check",
      label: node.checked ? "Mark incomplete" : "Mark complete",
      onSelect: () => h.onToggleChecked(node.id, !node.checked),
    },
    {
      id: "delete",
      label: "Delete task",
      danger: true,
      onSelect: () => h.onDeleteNode(node.id),
    },
  ];
}
