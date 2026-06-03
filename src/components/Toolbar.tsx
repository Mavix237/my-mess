import { displayLabel, PLACEHOLDERS } from "../copy";
import { IconCategory, IconList, IconPlus } from "./Icons";
import styles from "./Toolbar.module.css";

type Props = {
  categories: { id: string; label: string }[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  onAddCategory: () => void;
  onAddTask: () => void;
  onResetView: () => void;
  listOpen: boolean;
  onToggleList: () => void;
};

export function Toolbar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onAddTask,
  onResetView,
  listOpen,
  onToggleList,
}: Props) {
  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>My Mess</h1>

      {categories.length > 1 && (
        <>
          <span className={styles.divider} aria-hidden />
          <div className={styles.tabs} role="tablist" aria-label="Categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={cat.id === selectedCategoryId}
              className={`${styles.tab} ${cat.id === selectedCategoryId ? styles.tabActive : ""}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              {displayLabel(cat.label, PLACEHOLDERS.category)}
            </button>
          ))}
          </div>
        </>
      )}

      <span className={styles.divider} aria-hidden />

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconAction} ${listOpen ? styles.iconActive : ""}`}
          title="All items"
          aria-label="All items"
          aria-pressed={listOpen}
          onClick={onToggleList}
        >
          <IconList size={15} />
          <span className={styles.srOnly}>All items</span>
        </button>
        <button
          type="button"
          className={styles.iconAction}
          title="Add category"
          aria-label="Add category"
          onClick={onAddCategory}
        >
          <IconCategory size={15} />
          <span className={styles.srOnly}>Add category</span>
        </button>
        <button
          type="button"
          className={`${styles.iconAction} ${styles.iconPrimary}`}
          title="Add task"
          aria-label="Add task"
          onClick={onAddTask}
          disabled={!selectedCategoryId}
        >
          <IconPlus size={15} />
          <span className={styles.srOnly}>Add task</span>
        </button>
        <button
          type="button"
          className={styles.textAction}
          onClick={onResetView}
        >
          Reset
        </button>
      </div>
    </header>
  );
}
