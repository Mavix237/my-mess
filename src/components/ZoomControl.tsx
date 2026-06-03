import { ZOOM_MAX, ZOOM_MIN } from "../viewport";
import styles from "./ZoomControl.module.css";

type Props = {
  scale: number;
  onScaleChange: (scale: number) => void;
};

export function ZoomControl({ scale, onScaleChange }: Props) {
  const pct = Math.round(scale * 100);

  return (
    <div className={styles.wrap} data-zoom>
      <label className={styles.label}>
        <span className={styles.srOnly}>Zoom</span>
        <input
          type="range"
          className={styles.slider}
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={scale}
          onChange={(e) => onScaleChange(Number(e.target.value))}
          aria-valuemin={Math.round(ZOOM_MIN * 100)}
          aria-valuemax={Math.round(ZOOM_MAX * 100)}
          aria-valuenow={pct}
          aria-valuetext={`${pct}%`}
        />
      </label>
      <span className={styles.value} aria-hidden>
        {pct}%
      </span>
    </div>
  );
}
