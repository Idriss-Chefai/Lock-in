import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global single-key shortcuts (Section 24). Disabled while focus is inside
 * a text input/textarea/contenteditable so typing "e" in a note doesn't
 * jump you to the Expenses flow.
 */
const SHORTCUT_ROUTES: Record<string, string> = {
  l: "/today", // daily log
  n: "/tasks?new=1",
  h: "/habits",
  e: "/finance?new=expense",
  g: "/goals",
  p: "/projects",
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (isEditable) return;

      const route = SHORTCUT_ROUTES[e.key.toLowerCase()];
      if (route) {
        e.preventDefault();
        navigate(route);
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
