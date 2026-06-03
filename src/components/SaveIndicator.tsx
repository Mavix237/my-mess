import type { SaveStatus } from "../persistence";
import styles from "./SaveIndicator.module.css";

type Props = {
  status: SaveStatus;
};

const LABELS: Record<SaveStatus, string | null> = {
  idle: null,
  saved: "Saved locally",
  "saved-no-images":
    "Saved — images removed (browser storage full)",
  error: "Could not save — try fewer images",
};

export function SaveIndicator({ status }: Props) {
  const label = LABELS[status];
  if (!label) return null;

  return (
    <p
      className={`${styles.hint} ${status === "error" ? styles.error : ""} ${status === "saved-no-images" ? styles.warn : ""}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </p>
  );
}
