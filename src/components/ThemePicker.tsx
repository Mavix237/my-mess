import { THEME_PRESETS, type ThemeId } from "../theme";
import styles from "./ThemePicker.module.css";

type Props = {
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
};

export function ThemePicker({ themeId, onThemeChange }: Props) {
  return (
    <div
      className={styles.wrap}
      data-theme-picker
      role="group"
      aria-label="Theme color"
    >
      {THEME_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`${styles.swatch} ${themeId === preset.id ? styles.swatchActive : ""}`}
          style={{ background: preset.swatch }}
          title={preset.label}
          aria-label={preset.label}
          aria-pressed={themeId === preset.id}
          onClick={() => onThemeChange(preset.id)}
        />
      ))}
    </div>
  );
}
