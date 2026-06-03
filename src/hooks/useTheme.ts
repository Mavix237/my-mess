import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  DEFAULT_THEME_ID,
  getStoredThemeId,
  THEME_STORAGE_KEY,
  type ThemeId,
} from "../theme";

export function useTheme() {
  const [themeId, setThemeIdState] = useState<ThemeId>(getStoredThemeId);

  useEffect(() => {
    applyTheme(themeId);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      /* ignore */
    }
  }, [themeId]);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
  }, []);

  return { themeId, setThemeId, defaultThemeId: DEFAULT_THEME_ID };
}
