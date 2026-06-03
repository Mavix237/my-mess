import { useState } from "react";
import { priorityColor } from "../theme";
import {
  PRIORITY_CODES,
  PRIORITY_LABELS,
  fillCount,
  type Priority,
} from "../types";
import styles from "./PriorityPicker.module.css";

const LEVELS_LEFT_TO_RIGHT: Priority[] = [3, 2, 1, 0];

type Props = {
  value: Priority;
  onChange: (p: Priority) => void;
};

export function PriorityPicker({ value, onChange }: Props) {
  const [hoverLevel, setHoverLevel] = useState<Priority | null>(null);
  const previewLevel = (hoverLevel ?? value) as Priority;
  const filledCount = fillCount(previewLevel);
  const fillColor = priorityColor(previewLevel);

  return (
    <div
      className={styles.wrap}
      role="group"
      aria-label="Priority"
      onMouseLeave={() => setHoverLevel(null)}
    >
      <div className={styles.bar}>
        {LEVELS_LEFT_TO_RIGHT.map((level) => {
          const vis = 3 - level;
          const filled = vis < filledCount;
          const code = PRIORITY_CODES[level];
          return (
            <button
              key={code}
              type="button"
              className={styles.segment}
              title={`${code} — ${PRIORITY_LABELS[level]}`}
              aria-label={`${code} — ${PRIORITY_LABELS[level]}`}
              aria-pressed={value === level}
              onMouseEnter={() => setHoverLevel(level)}
              onFocus={() => setHoverLevel(level)}
              onBlur={() => setHoverLevel(null)}
              onClick={() => {
                onChange(level);
                setHoverLevel(null);
              }}
              style={{
                background: filled ? fillColor : "var(--priority-empty)",
              }}
            />
          );
        })}
      </div>
      <span
        className={styles.code}
        aria-hidden
        style={{
          color: previewLevel <= 1 ? "var(--ink)" : "var(--ink-muted)",
        }}
      >
        {PRIORITY_CODES[previewLevel]}
      </span>
    </div>
  );
}
