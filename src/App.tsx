import { useCallback, useEffect, useMemo, useState } from "react";
import { buildContextMenuItems } from "./buildContextMenuItems";
import { ClockDisplay } from "./components/ClockDisplay";
import { ContextMenu } from "./components/ContextMenu";
import { ItemListPanel } from "./components/ItemListPanel";
import { MindmapCanvas } from "./components/MindmapCanvas";
import { SaveIndicator } from "./components/SaveIndicator";
import { Toolbar } from "./components/Toolbar";
import { ThemePicker } from "./components/ThemePicker";
import { ZoomControl } from "./components/ZoomControl";
import type { ContextMenuState } from "./contextMenuState";
import { useMindmap } from "./hooks/useMindmap";
import { useTheme } from "./hooks/useTheme";
import { zoomAtScreenPoint } from "./viewport";
import styles from "./App.module.css";

export default function App() {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const {
    mindmap,
    viewport,
    setViewport,
    categories,
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
  } = useMindmap();
  const { themeId, setThemeId } = useTheme();

  const handleUndo = useCallback(() => {
    const snap = undo();
    if (!snap) return;
    const restoredIds = new Set(snap.mindmap.nodes.map((n) => n.id));
    setFocusedNodeId((prev) =>
      prev && restoredIds.has(prev) ? prev : snap.selectedCategoryId,
    );
  }, [undo]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "z" || e.shiftKey) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, [contenteditable='true']")
      ) {
        return;
      }
      e.preventDefault();
      handleUndo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo]);

  const handleSelectCategory = (id: string) => {
    selectCategory(id);
    setFocusedNodeId(id);
  };

  const handleFocusNode = (nodeId: string) => {
    focusNode(nodeId);
    setFocusedNodeId(nodeId);
  };

  const handleActivateNode = (nodeId: string) => {
    const node = mindmap.nodes.find((n) => n.id === nodeId);
    if (node?.isCategory) selectCategory(nodeId);
    setFocusedNodeId(nodeId);
  };

  const handleEditStart = (nodeId: string) => {
    setFocusedNodeId(nodeId);
  };

  const showNodeShadow = (nodeId: string) => focusedNodeId === nodeId;

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openContextMenu = useCallback(
    (x: number, y: number, target: ContextMenuState["target"]) => {
      setContextMenu({ x, y, target });
    },
    [],
  );

  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return [];
    return buildContextMenuItems(contextMenu.target, {
      nodes: mindmap.nodes,
      selectedCategoryId,
      hasCategory: categories.length > 0,
      onAddTask: () => addTask(),
      onAddTaskAt: (pos) => addTaskAt(pos),
      onAddCategory: addCategory,
      onResetView: resetView,
      onToggleList: () => setListOpen((o) => !o),
      onUndo: handleUndo,
      onFocusNode: handleFocusNode,
      onToggleChecked: (id, checked) =>
        updateNode(id, {
          checked,
          ...(checked ? { notesOpen: false } : {}),
        }),
      onToggleNotes: (id, open) => updateNode(id, { notesOpen: open }),
      onDeleteNode: deleteNode,
      onAddTaskToCategory: (id) => addTask(id),
      onSelectCategory: handleSelectCategory,
      onDisconnect: removeConnection,
    });
  }, [
    contextMenu,
    mindmap.nodes,
    selectedCategoryId,
    categories.length,
    addTask,
    addTaskAt,
    addCategory,
    resetView,
    handleUndo,
    handleFocusNode,
    updateNode,
    deleteNode,
    handleSelectCategory,
    removeConnection,
  ]);

  const handleZoomChange = useCallback(
    (scale: number) => {
      const el = document.querySelector("[data-canvas-viewport]");
      const rect = el?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      setViewport((v) =>
        zoomAtScreenPoint(
          v,
          scale,
          window.innerWidth / 2,
          window.innerHeight / 2,
          left,
          top,
        ),
      );
    },
    [setViewport],
  );

  return (
    <div
      className={styles.app}
      onContextMenu={(e) => {
        const el = e.target;
        if (
          el instanceof HTMLElement &&
          el.closest(
            "input, textarea, [data-zoom], [data-theme-picker], [role='menu']",
          )
        ) {
          return;
        }
        e.preventDefault();
      }}
    >
      <ClockDisplay />
      <Toolbar
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
        onAddCategory={addCategory}
        onAddTask={() => addTask()}
        onResetView={resetView}
        listOpen={listOpen}
        onToggleList={() => setListOpen((o) => !o)}
      />

      {listOpen && (
        <ItemListPanel
          nodes={mindmap.nodes}
          selectedCategoryId={selectedCategoryId}
          onClose={() => setListOpen(false)}
          onSelectItem={handleFocusNode}
          onToggleChecked={(id, checked) =>
            updateNode(id, {
              checked,
              ...(checked ? { notesOpen: false } : {}),
            })
          }
        />
      )}

      <ThemePicker themeId={themeId} onThemeChange={setThemeId} />
      <ZoomControl scale={viewport.scale} onScaleChange={handleZoomChange} />
      <SaveIndicator status={saveStatus} />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}

      <MindmapCanvas
        nodes={mindmap.nodes}
        connections={mindmap.connections}
        positions={positions}
        viewport={viewport}
        setViewport={setViewport}
        updateNode={updateNode}
        setPosition={setPosition}
        deleteNode={deleteNode}
        selectCategory={handleSelectCategory}
        addTask={addTask}
        connectNodes={connectNodes}
        removeConnection={removeConnection}
        findConnection={findConnection}
        spawnConnectedNode={spawnConnectedNode}
        onActivateNode={handleActivateNode}
        onEditStart={handleEditStart}
        onClearFocus={() => setFocusedNodeId(null)}
        showNodeShadow={showNodeShadow}
        onOpenContextMenu={openContextMenu}
      />
    </div>
  );
}
