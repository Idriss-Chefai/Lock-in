import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Button } from "./ui";

interface SketchModalProps {
  initialData?: string;
  onSave: (serialized: string) => void;
  onClose: () => void;
}

function getResolvedTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function SketchModal({ initialData, onSave, onClose }: SketchModalProps) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [excalidrawTheme, setExcalidrawTheme] = useState<"light" | "dark">(getResolvedTheme);
  let parsedInitial: { elements?: never[]; appState?: Record<string, unknown> } | undefined;

  if (initialData) {
    try {
      parsedInitial = JSON.parse(initialData);
    } catch {
      parsedInitial = undefined;
    }
  }

  useEffect(() => {
    const observer = new MutationObserver(() => setExcalidrawTheme(getResolvedTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleSave = useCallback(() => {
    if (!excalidrawRef.current) return;
    const serialized = serializeAsJSON(
      excalidrawRef.current.getSceneElements(),
      excalidrawRef.current.getAppState(),
      {},
      "local"
    );
    onSave(serialized);
    onClose();
  }, [onSave, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl w-full h-full max-w-6xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-medium text-ink">Sketch</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save sketch</Button>
          </div>
        </div>
        <div className="flex-1">
          <Excalidraw
            theme={excalidrawTheme}
            excalidrawAPI={(api) => { excalidrawRef.current = api; }}
            initialData={parsedInitial}
          />
        </div>
      </div>
    </div>
  );
}