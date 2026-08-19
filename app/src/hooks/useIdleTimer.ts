import { useEffect } from "react";

export function useIdleTimer(thresholdMs: number, onIdle: () => void) {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timeout);
      timeout = setTimeout(onIdle, thresholdMs);
    };
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, reset));
    reset();
    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [thresholdMs, onIdle]);
}