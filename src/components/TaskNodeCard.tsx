import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from "react";
import { PLACEHOLDERS } from "../copy";
import type { Side } from "../geometry";
import type { TaskNode, Vec2 } from "../types";
import { IconChevronDown, IconClose, IconGrip, IconPlus } from "./Icons";
import { PriorityPicker } from "./PriorityPicker";
import styles from "./TaskNodeCard.module.css";

const SIDES: Side[] = ["n", "e", "s", "w"];
const LIGHTBOX_ANIM_MS = 360;

type Props = {
  node: TaskNode;
  position: Vec2;
  isFocused?: boolean;
  showConnectors?: boolean;
  onActivate?: (id: string) => void;
  onEditStart?: (id: string) => void;
  onUpdate: (id: string, patch: Partial<TaskNode>) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: PointerEvent, nodeId: string) => void;
  onConnectorStart: (e: PointerEvent, nodeId: string, side: Side) => void;
  onHoverChange?: (nodeId: string | null) => void;
  onSelectCategory?: (id: string) => void;
  onAddTaskToCategory?: (categoryId: string) => void;
  onOpenContextMenu?: (e: ReactMouseEvent) => void;
};

export function TaskNodeCard({
  node,
  position,
  isFocused,
  showConnectors,
  onUpdate,
  onDelete,
  onDragStart,
  onConnectorStart,
  onHoverChange,
  onActivate,
  onEditStart,
  onSelectCategory,
  onAddTaskToCategory,
  onOpenContextMenu,
}: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openLightbox = useCallback(
    (idx: number) => {
      clearCloseTimer();
      setLightboxIdx(idx);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setLightboxOpen(true));
      });
    },
    [clearCloseTimer],
  );

  const closeLightbox = useCallback(() => {
    clearCloseTimer();
    setLightboxOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setLightboxIdx(null);
      closeTimerRef.current = null;
    }, LIGHTBOX_ANIM_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!node.notesOpen && lightboxIdx !== null) closeLightbox();
  }, [node.notesOpen, lightboxIdx, closeLightbox]);

  useEffect(() => {
    if (lightboxIdx !== null && lightboxIdx >= node.images.length) {
      closeLightbox();
    }
  }, [node.images.length, lightboxIdx, closeLightbox]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, closeLightbox]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const toggleImageExpand = useCallback(
    (idx: number) => {
      if (lightboxIdx === idx && lightboxOpen) {
        closeLightbox();
      } else {
        openLightbox(idx);
      }
    },
    [lightboxIdx, lightboxOpen, openLightbox, closeLightbox],
  );

  const isCompact = !node.isCategory && node.checked;

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      onUpdate(node.id, {
        checked,
        ...(checked ? { notesOpen: false } : {}),
      });
    },
    [node.id, onUpdate],
  );

  const taskActions = (
    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`${styles.iconBtn} ${node.notesOpen ? styles.iconActive : ""}`}
        title={node.notesOpen ? "Collapse notes" : "Expand notes"}
        aria-label={node.notesOpen ? "Collapse notes" : "Expand notes"}
        aria-expanded={node.notesOpen}
        onClick={() => onUpdate(node.id, { notesOpen: !node.notesOpen })}
      >
        <IconChevronDown
          size={14}
          className={node.notesOpen ? styles.chevronOpen : styles.chevron}
        />
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        title="Delete"
        aria-label="Delete"
        onClick={() => onDelete(node.id)}
      >
        <IconClose size={14} />
      </button>
    </div>
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            onUpdate(node.id, {
              images: [...node.images, reader.result as string],
            });
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [node.id, node.images, onUpdate],
  );

  return (
    <div
      className={`${styles.node} ${node.isCategory ? styles.category : ""} ${isFocused ? styles.focused : ""} ${showConnectors ? styles.near : ""}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerEnter={() => onHoverChange?.(node.id)}
      onPointerLeave={() => onHoverChange?.(null)}
    >
      {showConnectors &&
        SIDES.map((side) => (
          <button
            key={side}
            type="button"
            className={`${styles.connector} ${styles[`connector_${side}`]}`}
            aria-label={`Connect ${side}`}
            data-connector={side}
            data-node-id={node.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              onConnectorStart(e, node.id, side);
            }}
          />
        ))}

      <article
        className={`${styles.card} ${node.checked ? styles.done : ""}`}
        data-node-id={node.id}
        onContextMenu={(e) => onOpenContextMenu?.(e)}
        onClick={() => {
          onActivate?.(node.id);
          if (node.isCategory) onSelectCategory?.(node.id);
        }}
      >
        <div
          className={`${styles.mainRow} ${isCompact ? styles.mainRowCompact : ""}`}
        >
          <button
            type="button"
            className={styles.handle}
            onPointerDown={(e) => onDragStart(e, node.id)}
            aria-label="Move"
          >
            <IconGrip size={10} className={styles.gripIcon} />
          </button>

          {!node.isCategory && (
            <label className={styles.check} onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={node.checked}
                onChange={(e) => handleCheckedChange(e.target.checked)}
              />
              <span className={styles.checkBox} />
            </label>
          )}

          <input
            type="text"
            className={styles.label}
            value={node.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            onFocus={() => onEditStart?.(node.id)}
            onClick={(e) => e.stopPropagation()}
            placeholder={
              node.isCategory ? PLACEHOLDERS.category : PLACEHOLDERS.task
            }
          />

          {node.isCategory && (
            <div
              className={styles.actions}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.iconBtn}
                title="Add task"
                aria-label="Add task"
                onClick={() => onAddTaskToCategory?.(node.id)}
              >
                <IconPlus size={14} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="Delete"
                aria-label="Delete"
                onClick={() => onDelete(node.id)}
              >
                <IconClose size={14} />
              </button>
            </div>
          )}

          {isCompact && taskActions}
        </div>

        {!node.isCategory && !isCompact && (
          <div className={styles.metaRow} onClick={(e) => e.stopPropagation()}>
            <PriorityPicker
              value={node.priority}
              onChange={(p) => onUpdate(node.id, { priority: p })}
            />
            {taskActions}
          </div>
        )}

        {!node.isCategory && node.notesOpen && (
          <div className={styles.notes} onPaste={handlePaste}>
            <textarea
              className={styles.textarea}
              value={node.notes}
              onChange={(e) => onUpdate(node.id, { notes: e.target.value })}
              onFocus={() => onEditStart?.(node.id)}
              placeholder={PLACEHOLDERS.notes}
              rows={3}
            />
            {node.images.length > 0 && (
              <div className={styles.images}>
                {node.images.map((src, idx) => (
                  <figure
                    key={idx}
                    className={`${styles.figure} ${lightboxIdx === idx && lightboxOpen ? styles.figureExpanded : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.imagePreview}
                      aria-label={
                        lightboxIdx === idx && lightboxOpen
                          ? "Close enlarged image"
                          : "Enlarge image"
                      }
                      aria-pressed={lightboxIdx === idx && lightboxOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImageExpand(idx);
                      }}
                    >
                      <img src={src} alt="" draggable={false} />
                    </button>
                    <button
                      type="button"
                      className={styles.removeImg}
                      title="Remove image"
                      aria-label="Remove image"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (lightboxIdx === idx) closeLightbox();
                        onUpdate(node.id, {
                          images: node.images.filter((_, i) => i !== idx),
                        });
                      }}
                    >
                      <IconClose size={12} />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>
        )}
      </article>

      {lightboxIdx !== null && node.images[lightboxIdx] && (
        <div
          className={`${styles.lightbox} ${lightboxOpen ? styles.lightboxOpen : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image"
          onClick={closeLightbox}
        >
          <img
            className={styles.lightboxImg}
            src={node.images[lightboxIdx]}
            alt=""
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
          />
        </div>
      )}
    </div>
  );
}
