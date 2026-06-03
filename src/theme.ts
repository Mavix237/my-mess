export type ThemeId =
  | "lime"
  | "periwinkle"
  | "mint"
  | "stone"
  | "night";

export type ThemePreset = {
  id: ThemeId;
  label: string;
  swatch: string;
  vars: Record<string, string>;
};

export const THEME_STORAGE_KEY = "my-mess-theme-v1";

export const DEFAULT_THEME_ID: ThemeId = "lime";

/** Lines, icons, borders — inverted for dark themes. */
const LIGHT_CHROME: Record<string, string> = {
  "--stroke": "#0a0a0a",
  "--surface-icon": "#0a0a0a",
  "--border-color": "#0a0a0a",
  "--fill-strong": "#0a0a0a",
  "--tab-active-bg": "#0a0a0a",
  "--border-muted-color": "rgba(10, 10, 10, 0.18)",
  "--shadow-bold-color": "#0a0a0a",
  "--edge-opacity": "0.28",
  "--divider": "rgba(10, 10, 10, 0.35)",
};

const NIGHT_CHROME: Record<string, string> = {
  "--stroke": "#c8c8d4",
  "--surface-icon": "#e4e4ec",
  "--border-color": "#b4b4be",
  "--fill-strong": "#e8e8ee",
  "--tab-active-bg": "#b8bcc8",
  "--tab-active-text": "#131316",
  "--border-muted-color": "rgba(255, 255, 255, 0.14)",
  "--shadow-bold-color": "rgba(0, 0, 0, 0.55)",
  "--edge-opacity": "0.58",
  "--divider": "rgba(255, 255, 255, 0.22)",
  "--line": "#4e4e58",
  "--line-soft": "#383840",
  "--ink-faint": "#9696a4",
  "--priority-low": "#6a6a74",
};

function withChrome(
  id: ThemeId,
  vars: Record<string, string>,
): Record<string, string> {
  const chrome = id === "night" ? NIGHT_CHROME : LIGHT_CHROME;
  return { ...vars, ...chrome };
}

const RAW_THEME_PRESETS: ThemePreset[] = [
  {
    id: "lime",
    label: "Lime",
    swatch: "#c6ff4c",
    vars: {
      "--lime": "#c6ff4c",
      "--lime-light": "#d8ff7a",
      "--lime-dark": "#9ed63a",
      "--lime-deep": "#7ab82a",
      "--lime-muted": "#e8f5c8",
      "--paper": "#f8fbf0",
      "--paper-deep": "#eef5dc",
      "--ink": "#1a1f12",
      "--ink-muted": "#5c6349",
      "--ink-faint": "#949e82",
      "--card": "#fefff8",
      "--line": "#cdd9b0",
      "--line-soft": "#e2ebd0",
      "--priority-empty": "#e4e6e0",
      "--priority-mid": "#b8e84a",
    },
  },
  {
    id: "periwinkle",
    label: "Periwinkle",
    swatch: "#7c83ff",
    vars: {
      "--lime": "#7c83ff",
      "--lime-light": "#9da3ff",
      "--lime-dark": "#6269e8",
      "--lime-deep": "#4f56d4",
      "--lime-muted": "#e8eaff",
      "--paper": "#f5f6fc",
      "--paper-deep": "#ebedf8",
      "--ink": "#1c1d2e",
      "--ink-muted": "#5a5c72",
      "--ink-faint": "#9193a8",
      "--card": "#fafbff",
      "--line": "#d4d7eb",
      "--line-soft": "#e4e6f2",
      "--priority-empty": "#e6e7ef",
      "--priority-mid": "#949bff",
    },
  },
  {
    id: "mint",
    label: "Mint",
    swatch: "#4ecdc4",
    vars: {
      "--lime": "#4ecdc4",
      "--lime-light": "#72dbd4",
      "--lime-dark": "#38b5ad",
      "--lime-deep": "#2a9a93",
      "--lime-muted": "#dff5f3",
      "--paper": "#f3fbf9",
      "--paper-deep": "#e8f5f2",
      "--ink": "#142220",
      "--ink-muted": "#4f6562",
      "--ink-faint": "#8aa39f",
      "--card": "#f8fffe",
      "--line": "#c5e5e0",
      "--line-soft": "#dcefe9",
      "--priority-empty": "#e3ebe9",
      "--priority-mid": "#6ed9d2",
    },
  },
  {
    id: "stone",
    label: "Stone",
    swatch: "#e4e4e0",
    vars: {
      "--lime": "#b8bcb4",
      "--lime-light": "#d4d6d0",
      "--lime-dark": "#9a9e96",
      "--lime-deep": "#7e827a",
      "--lime-muted": "#efefec",
      "--paper": "#f7f7f5",
      "--paper-deep": "#ececea",
      "--ink": "#2c2c2a",
      "--ink-muted": "#686864",
      "--ink-faint": "#989894",
      "--card": "#fcfcfa",
      "--line": "#dddcd8",
      "--line-soft": "#ebeae6",
      "--priority-empty": "#e6e6e2",
      "--priority-mid": "#c4c8c0",
    },
  },
  {
    id: "night",
    label: "Night",
    swatch: "#3a3a40",
    vars: {
      "--lime": "#b8bcc8",
      "--lime-light": "#d0d4de",
      "--lime-dark": "#8e92a0",
      "--lime-deep": "#6e7280",
      "--lime-muted": "#2c2e34",
      "--paper": "#131316",
      "--paper-deep": "#1b1b1f",
      "--ink": "#ececee",
      "--ink-muted": "#a8a8b0",
      "--ink-faint": "#707078",
      "--card": "#222226",
      "--line": "#3a3a42",
      "--line-soft": "#2e2e34",
      "--priority-empty": "#323238",
      "--priority-mid": "#9aa0b0",
    },
  },
];

export const THEME_PRESETS: ThemePreset[] = RAW_THEME_PRESETS.map((preset) => ({
  ...preset,
  vars: withChrome(preset.id, preset.vars),
}));

const presetById = new Map(THEME_PRESETS.map((t) => [t.id, t]));

export function isThemeId(value: string): value is ThemeId {
  return presetById.has(value as ThemeId);
}

export function getStoredThemeId(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && isThemeId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID;
}

const CHROME_KEYS = [
  ...new Set([...Object.keys(LIGHT_CHROME), ...Object.keys(NIGHT_CHROME)]),
];

export function applyTheme(id: ThemeId): void {
  const preset = presetById.get(id) ?? presetById.get(DEFAULT_THEME_ID)!;
  const root = document.documentElement;
  root.dataset.theme = preset.id;
  const { vars } = preset;

  for (const key of CHROME_KEYS) {
    if (key in vars) {
      root.style.setProperty(key, vars[key]!);
    } else {
      root.style.removeProperty(key);
    }
  }

  for (const [key, value] of Object.entries(vars)) {
    if (!CHROME_KEYS.includes(key)) {
      root.style.setProperty(key, value);
    }
  }
}

const PRIORITY_FIXED: Record<0 | 1 | 3, string> = {
  0: "#e0453a",
  1: "#f0a82e",
  3: "var(--priority-low, #d4dcc8)",
};

/** Priority bar colors; P2 follows the active theme. */
export function priorityColor(level: 0 | 1 | 2 | 3): string {
  if (level === 2) return "var(--priority-mid)";
  return PRIORITY_FIXED[level];
}
