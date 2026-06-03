import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  anchorAt,
  oppositeSide,
  sideToward,
  type Side,
} from "../geometry";
import type { ContextMenuTarget } from "../contextMenuState";
import type { Connection, TaskNode, Vec2, ViewportState } from "../types";
import { WORLD_H, WORLD_W } from "../types";
import { zoomByFactor } from "../viewport";
import { TaskNodeCard } from "./TaskNodeCard";
import styles from "./MindmapCanvas.module.css";

type DragSession = {
  kind: "pan" | "node";
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
  scale: number;
  nodeId?: string;
  nodeX?: number;
  nodeY?: number;
};

type TouchGesture = {
  cx: number;
  cy: number;
  distance: number;
};

const SPAWN_MIN_DISTANCE = 100;

type LinkDrag = {
  fromId: string;
  fromSide: Side;
  pointerId: number;
  anchorX: number;
  anchorY: number;
};

type Props = {
  nodes: TaskNode[];
  connections: Connection[];
  positions: Record<string, Vec2>;
  viewport: ViewportState;
  setViewport: (v: ViewportState) => void;
  updateNode: (id: string, patch: Partial<TaskNode>) => void;
  setPosition: (id: string, pos: Vec2) => void;
  deleteNode: (id: string) => void;
  selectCategory: (id: string) => void;
  addTask: (categoryId?: string) => void;
  connectNodes: (fromId: string, toId: string, fromSide: Side, toSide?: Side) => void;
  removeConnection: (connectionId: string) => void;
  findConnection: (fromId: string, toId: string) => { id: string } | undefined;
  spawnConnectedNode: (fromId: string, at: Vec2) => void;
  onActivateNode: (nodeId: string) => void;
  onEditStart: (nodeId: string) => void;
  onClearFocus: () => void;
  showNodeShadow: (nodeId: string) => boolean;
  onOpenContextMenu: (x: number, y: number, target: ContextMenuTarget) => void;
};

export function MindmapCanvas({
  nodes,
  connections,
  positions,
  viewport,
  setViewport,
  updateNode,
  setPosition,
  deleteNode,
  selectCategory,
  addTask,
  connectNodes,
  removeConnection,
  findConnection,
  spawnConnectedNode,
  onActivateNode,
  onEditStart,
  onClearFocus,
  showNodeShadow,
  onOpenContextMenu,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const linkDragRef = useRef<LinkDrag | null>(null);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const viewportPanRef = useRef(viewport);
  viewportPanRef.current = viewport;
  const [grabbing, setGrabbing] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
  const [linkCursor, setLinkCursor] = useState<Vec2 | null>(null);

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const edges = useMemo(() => {
    return connections
      .map((conn) => {
        const fromNode = nodeMap.get(conn.from);
        const toNode = nodeMap.get(conn.to);
        const fromCenter = positions[conn.from];
        const toCenter = positions[conn.to];
        if (!fromNode || !toNode || !fromCenter || !toCenter) return null;
        const toSide = oppositeSide(sideToward(fromCenter, toCenter));
        const fromSide = sideToward(fromCenter, toCenter);
        return {
          id: conn.id,
          x1: anchorAt(fromCenter, fromNode, fromSide).x,
          y1: anchorAt(fromCenter, fromNode, fromSide).y,
          x2: anchorAt(toCenter, toNode, toSide).x,
          y2: anchorAt(toCenter, toNode, toSide).y,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }>;
  }, [connections, positions, nodeMap]);

  const previewLine = useMemo(() => {
    if (!linkDrag || !linkCursor) return null;
    const fromNode = nodeMap.get(linkDrag.fromId);
    const fromCenter = positions[linkDrag.fromId];
    if (!fromNode || !fromCenter) return null;
    const start = anchorAt(fromCenter, fromNode, linkDrag.fromSide);
    return { x1: start.x, y1: start.y, x2: linkCursor.x, y2: linkCursor.y };
  }, [linkDrag, linkCursor, nodeMap, positions]);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: (clientX - rect.left - viewport.panX) / viewport.scale,
        y: (clientY - rect.top - viewport.panY) / viewport.scale,
      };
    },
    [viewport.panX, viewport.panY, viewport.scale],
  );

  const shouldIgnoreGesture = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest(
      "input, textarea, button, [role='dialog'], aside, [data-zoom], [data-theme-picker]",
    );
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const onWheel = (e: WheelEvent) => {
      if (shouldIgnoreGesture(e.target)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const v = viewportPanRef.current;

      if (e.ctrlKey) {
        const factor = Math.exp(-e.deltaY * 0.008);
        const x = e.clientX || pointerRef.current.x;
        const y = e.clientY || pointerRef.current.y;
        setViewport(zoomByFactor(v, factor, x, y, rect.left, rect.top));
        return;
      }

      setViewport({
        ...v,
        panX: v.panX - e.deltaX,
        panY: v.panY - e.deltaY,
      });
    };

    const touchCenter = (touches: TouchList) => {
      const t0 = touches[0];
      const t1 = touches[1];
      return {
        cx: (t0.clientX + t1.clientX) / 2,
        cy: (t0.clientY + t1.clientY) / 2,
        distance: Math.hypot(
          t1.clientX - t0.clientX,
          t1.clientY - t0.clientY,
        ),
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      if (shouldIgnoreGesture(e.target)) return;
      const { cx, cy, distance } = touchCenter(e.touches);
      touchGestureRef.current = { cx, cy, distance };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !touchGestureRef.current) return;
      if (shouldIgnoreGesture(e.target)) return;
      e.preventDefault();
      const { cx, cy, distance } = touchCenter(e.touches);
      const prev = touchGestureRef.current;
      const rect = el.getBoundingClientRect();
      let v = viewportPanRef.current;
      if (prev.distance > 0 && distance > 0) {
        v = zoomByFactor(
          v,
          distance / prev.distance,
          cx,
          cy,
          rect.left,
          rect.top,
        );
      }
      v = {
        ...v,
        panX: v.panX + (cx - prev.cx),
        panY: v.panY + (cy - prev.cy),
      };
      touchGestureRef.current = { cx, cy, distance };
      setViewport(v);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) touchGestureRef.current = null;
    };

    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [setViewport, shouldIgnoreGesture, viewport]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setGrabbing(false);
  }, []);

  const endLinkDrag = useCallback(() => {
    linkDragRef.current = null;
    setLinkDrag(null);
    setLinkCursor(null);
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const link = linkDragRef.current;
      if (link && e.pointerId === link.pointerId) {
        setLinkCursor(clientToWorld(e.clientX, e.clientY));
        return;
      }

      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (drag.kind === "pan") {
        setViewport({
          ...viewportPanRef.current,
          panX: drag.panX + dx,
          panY: drag.panY + dy,
        });
      } else if (drag.kind === "node" && drag.nodeId != null) {
        setPosition(drag.nodeId, {
          x: (drag.nodeX ?? 0) + dx / drag.scale,
          y: (drag.nodeY ?? 0) + dy / drag.scale,
        });
      }
    },
    [setViewport, setPosition, clientToWorld],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const link = linkDragRef.current;
      if (link && e.pointerId === link.pointerId) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const connector = target?.closest(
          "[data-connector][data-node-id]",
        ) as HTMLElement | null;
        const card = target?.closest("[data-node-id]") as HTMLElement | null;

        let connected = false;

        if (connector) {
          const toId = connector.dataset.nodeId!;
          const toSide = connector.dataset.connector as Side;
          if (toId !== link.fromId) {
            const existing = findConnection(link.fromId, toId);
            if (existing) {
              removeConnection(existing.id);
            } else {
              connectNodes(link.fromId, toId, link.fromSide, toSide);
            }
            connected = true;
          }
        } else if (card) {
          const toId = card.dataset.nodeId!;
          if (toId && toId !== link.fromId) {
            const fromCenter = positions[link.fromId];
            const toCenter = positions[toId];
            if (fromCenter && toCenter) {
              const toSide = oppositeSide(sideToward(fromCenter, toCenter));
              const existing = findConnection(link.fromId, toId);
              if (existing) {
                removeConnection(existing.id);
              } else {
                connectNodes(link.fromId, toId, link.fromSide, toSide);
              }
              connected = true;
            }
          }
        }

        if (!connected) {
          const drop = clientToWorld(e.clientX, e.clientY);
          const dist = Math.hypot(
            drop.x - link.anchorX,
            drop.y - link.anchorY,
          );
          if (dist >= SPAWN_MIN_DISTANCE) {
            spawnConnectedNode(link.fromId, drop);
          }
        }

        endLinkDrag();
        return;
      }

      if (dragRef.current?.pointerId === e.pointerId) endDrag();
    },
    [
      connectNodes,
      removeConnection,
      findConnection,
      positions,
      clientToWorld,
      spawnConnectedNode,
      endLinkDrag,
      endDrag,
    ],
  );

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const startPan = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0 || linkDragRef.current) return;
      if ((e.target as HTMLElement).closest("[data-connector]")) return;
      if ((e.target as HTMLElement).closest(`.${styles.edgeGroup}`)) return;
      onClearFocus();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        kind: "pan",
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        panX: viewport.panX,
        panY: viewport.panY,
        scale: viewport.scale,
      };
      setGrabbing(true);
    },
    [viewport.panX, viewport.panY, viewport.scale, onClearFocus],
  );

  const startNodeDrag = useCallback(
    (e: ReactPointerEvent, nodeId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = positions[nodeId];
      dragRef.current = {
        kind: "node",
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        panX: viewport.panX,
        panY: viewport.panY,
        scale: viewport.scale,
        nodeId,
        nodeX: pos?.x,
        nodeY: pos?.y,
      };
      setGrabbing(true);
    },
    [positions, viewport.panX, viewport.panY, viewport.scale],
  );

  const startConnectorDrag = useCallback(
    (e: ReactPointerEvent, nodeId: string, side: Side) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const fromNode = nodeMap.get(nodeId);
      const fromCenter = positions[nodeId];
      const anchor =
        fromNode && fromCenter
          ? anchorAt(fromCenter, fromNode, side)
          : clientToWorld(e.clientX, e.clientY);
      const session: LinkDrag = {
        fromId: nodeId,
        fromSide: side,
        pointerId: e.pointerId,
        anchorX: anchor.x,
        anchorY: anchor.y,
      };
      linkDragRef.current = session;
      setLinkDrag(session);
      setLinkCursor(clientToWorld(e.clientX, e.clientY));
      endDrag();
    },
    [nodeMap, positions, clientToWorld, endDrag],
  );

  const linking = linkDrag !== null;

  const openCanvasMenu = useCallback(
    (e: ReactMouseEvent) => {
      if (shouldIgnoreGesture(e.target)) return;
      e.preventDefault();
      onOpenContextMenu(e.clientX, e.clientY, {
        kind: "canvas",
        worldPos: clientToWorld(e.clientX, e.clientY),
      });
    },
    [clientToWorld, onOpenContextMenu, shouldIgnoreGesture],
  );

  return (
    <div
      ref={containerRef}
      data-canvas-viewport
      className={`${styles.viewport} ${grabbing ? styles.grabbing : ""} ${linking ? styles.linking : ""}`}
      onPointerDown={startPan}
      onContextMenu={openCanvasMenu}
    >
      <div
        className={styles.world}
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.scale})`,
        }}
      >
        <svg
          className={styles.svg}
          width={WORLD_W}
          height={WORLD_H}
          aria-hidden
        >
          <defs>
            <pattern
              id="grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="var(--line)" opacity="0.55" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {edges.map((edge) => (
            <g
              key={edge.id}
              className={styles.edgeGroup}
              onClick={(e) => {
                e.stopPropagation();
                removeConnection(edge.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenContextMenu(e.clientX, e.clientY, {
                  kind: "edge",
                  connectionId: edge.id,
                });
              }}
            >
              <line
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                className={styles.edgeHit}
              />
              <line
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                className={styles.edge}
                pointerEvents="none"
              />
            </g>
          ))}
          {previewLine && (
            <line
              x1={previewLine.x1}
              y1={previewLine.y1}
              x2={previewLine.x2}
              y2={previewLine.y2}
              className={styles.edgePreview}
            />
          )}
        </svg>

        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const showConnectors =
            linking || hoveredNodeId === node.id;
          return (
            <TaskNodeCard
              key={node.id}
              node={node}
              position={pos}
              isFocused={showNodeShadow(node.id)}
              showConnectors={showConnectors}
              onUpdate={updateNode}
              onDelete={deleteNode}
              onDragStart={startNodeDrag}
              onConnectorStart={startConnectorDrag}
              onHoverChange={setHoveredNodeId}
              onActivate={onActivateNode}
              onEditStart={() => onEditStart(node.id)}
              onSelectCategory={selectCategory}
              onAddTaskToCategory={addTask}
              onOpenContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenContextMenu(e.clientX, e.clientY, {
                  kind: "node",
                  nodeId: node.id,
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
