import { useMemo, useState } from "react";
import { displayLabel, PLACEHOLDERS } from "../copy";
import { priorityColor } from "../theme";
import {
  PRIORITY_CODES,
  PRIORITY_LABELS,
  type Priority,
  type TaskNode,
} from "../types";
import { IconClose } from "./Icons";
import styles from "./ItemListPanel.module.css";

type Props = {
  nodes: TaskNode[];
  selectedCategoryId: string | null;
  onClose: () => void;
  onSelectItem: (nodeId: string) => void;
  onToggleChecked: (nodeId: string, checked: boolean) => void;
};

type ListGroup = {
  category: TaskNode;
  tasks: TaskNode[];
};

type ListView = "category" | "priority";

const PRIORITY_ORDER: Priority[] = [0, 1, 2, 3];

function sortTasksByUrgency(tasks: TaskNode[]) {
  return [...tasks].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return displayLabel(a.label, PLACEHOLDERS.task).localeCompare(
      displayLabel(b.label, PLACEHOLDERS.task),
      undefined,
      { sensitivity: "base" },
    );
  });
}

export function ItemListPanel({
  nodes,
  selectedCategoryId,
  onClose,
  onSelectItem,
  onToggleChecked,
}: Props) {
  const [view, setView] = useState<ListView>("category");

  const { groups, orphanTasks, priorityGroups, categoryById, totalCount } =
    useMemo(() => {
      const categories = nodes.filter((n) => n.isCategory);
      const tasks = nodes.filter((n) => !n.isCategory);
      const categoryIds = new Set(categories.map((c) => c.id));
      const categoryById = new Map(categories.map((c) => [c.id, c]));

      const groups: ListGroup[] = categories.map((category) => ({
        category,
        tasks: sortTasksByUrgency(
          tasks.filter((t) => t.parentId === category.id),
        ),
      }));

      const orphanTasks = sortTasksByUrgency(
        tasks.filter((t) => !t.parentId || !categoryIds.has(t.parentId)),
      );

      const priorityGroups = PRIORITY_ORDER.map((priority) => ({
        priority,
        tasks: sortTasksByUrgency(tasks.filter((t) => t.priority === priority)),
      })).filter((g) => g.tasks.length > 0);

      return {
        groups,
        orphanTasks,
        priorityGroups,
        categoryById,
        totalCount: nodes.length,
      };
    }, [nodes]);

  const taskCount = nodes.filter((n) => !n.isCategory).length;

  return (
    <aside className={styles.panel} role="dialog" aria-label="All items">
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>All items</h2>
          <p className={styles.count}>{totalCount} total</p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close list"
        >
          <IconClose size={14} />
        </button>
      </header>

      <div className={styles.viewToggle} role="tablist" aria-label="List view">
        <button
          type="button"
          role="tab"
          aria-selected={view === "category"}
          className={`${styles.viewTab} ${view === "category" ? styles.viewTabActive : ""}`}
          onClick={() => setView("category")}
        >
          Categories
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "priority"}
          className={`${styles.viewTab} ${view === "priority" ? styles.viewTabActive : ""}`}
          onClick={() => setView("priority")}
        >
          Priority
        </button>
      </div>

      <div className={styles.scroll}>
        {taskCount === 0 && <p className={styles.empty}>No tasks yet</p>}

        {view === "category" && groups.length === 0 && taskCount > 0 && (
          <p className={styles.empty}>No categories</p>
        )}

        {view === "category" &&
          groups.map(({ category, tasks }) => (
          <section key={category.id} className={styles.section}>
            <button
              type="button"
              className={`${styles.row} ${styles.rowCategory} ${selectedCategoryId === category.id ? styles.rowActive : ""}`}
              onClick={() => onSelectItem(category.id)}
            >
              <span className={styles.categoryTag}>
                {displayLabel(category.label, PLACEHOLDERS.category)}
              </span>
            </button>

            {tasks.map((task) => (
              <ListTaskRow
                key={task.id}
                task={task}
                onSelectItem={onSelectItem}
                onToggleChecked={onToggleChecked}
              />
            ))}

            {tasks.length === 0 && (
              <p className={styles.subEmpty}>No tasks in this category</p>
            )}
          </section>
          ))}

        {view === "category" && orphanTasks.length > 0 && (
          <section className={styles.section}>
            <p className={styles.sectionLabel}>Other</p>
            {orphanTasks.map((task) => (
              <ListTaskRow
                key={task.id}
                task={task}
                onSelectItem={onSelectItem}
                onToggleChecked={onToggleChecked}
              />
            ))}
          </section>
        )}

        {view === "priority" &&
          priorityGroups.map(({ priority, tasks }) => (
            <section key={priority} className={styles.section}>
              <p
                className={styles.prioritySectionLabel}
                style={{
                  color: priority <= 1 ? "var(--ink)" : "var(--ink-muted)",
                }}
              >
                <span
                  className={styles.priorityDot}
                  style={{ background: priorityColor(priority) }}
                />
                {PRIORITY_CODES[priority]} — {PRIORITY_LABELS[priority]}
              </p>
              {tasks.map((task) => {
                const parent = task.parentId
                  ? categoryById.get(task.parentId)
                  : undefined;
                return (
                  <ListTaskRow
                    key={task.id}
                    task={task}
                    categoryHint={
                      parent
                        ? displayLabel(parent.label, PLACEHOLDERS.category)
                        : undefined
                    }
                    onSelectItem={onSelectItem}
                    onToggleChecked={onToggleChecked}
                  />
                );
              })}
            </section>
          ))}

        {view === "priority" && taskCount > 0 && priorityGroups.length === 0 && (
          <p className={styles.empty}>No tasks</p>
        )}
      </div>
    </aside>
  );
}

function ListTaskRow({
  task,
  categoryHint,
  onSelectItem,
  onToggleChecked,
}: {
  task: TaskNode;
  categoryHint?: string;
  onSelectItem: (id: string) => void;
  onToggleChecked: (id: string, checked: boolean) => void;
}) {
  return (
    <div
      className={`${styles.row} ${styles.rowTask} ${categoryHint ? styles.rowTaskPriority : ""} ${task.checked ? styles.rowDone : ""}`}
    >
      <label
        className={styles.check}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={task.checked}
          onChange={(e) => onToggleChecked(task.id, e.target.checked)}
        />
        <span className={styles.checkBox} />
      </label>
      <button
        type="button"
        className={styles.taskMain}
        onClick={() => onSelectItem(task.id)}
      >
        <span className={styles.taskText}>
          {categoryHint && (
            <span className={styles.categoryHint}>{categoryHint}</span>
          )}
          <span className={styles.label}>
            {displayLabel(task.label, PLACEHOLDERS.task)}
          </span>
        </span>
        <span
          className={styles.priorityBadge}
          title={PRIORITY_LABELS[task.priority]}
          style={{
            background: `color-mix(in srgb, ${priorityColor(task.priority)} 55%, var(--paper))`,
            color: task.priority <= 1 ? "var(--ink)" : "var(--ink-muted)",
          }}
        >
          {PRIORITY_CODES[task.priority]}
        </span>
      </button>
      {task.notes.trim() && <span className={styles.noteDot} title="Has notes" />}
    </div>
  );
}
