import { useCallback, useEffect, useState } from "react";
import { useDataStore } from "../services/datastore/context";
import type { Settings } from "../services/validation/schemas";

export function useTheme() {
  const store = useDataStore();
  const [theme, setThemeState] = useState<Settings["theme"]>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    store.getSettings().then((s) => {
      setThemeState(s.theme);
      setLoaded(true);
    });
  }, [store]);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const apply = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const listener = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
    apply(theme);
  }, [theme, loaded]);

  const setTheme = useCallback(
    async (next: Settings["theme"]) => {
      setThemeState(next);
      const current = await store.getSettings();
      await store.saveSettings({ ...current, theme: next });
    },
    [store]
  );

  return { theme, setTheme, loaded };
}
