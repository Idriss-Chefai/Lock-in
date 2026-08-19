import { useCallback, useRef } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Button } from "./ui";

interface SketchModalProps {
  initialData?: string;
  onSave: (serialized: string) => void;
  onClose: () => void;
}

export function SketchModal({ initialData, onSave, onClose }: SketchModalProps) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  let parsedInitial: { elements?: never[]; appState?: Record<string, unknown> } | undefined;

  if (initialData) {
    try {
      parsedInitial = JSON.parse(initialData);
    } catch {
      parsedInitial = undefined;
    }
  }

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
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6">
      <div className="bg-surface rounded-xl w-full h-full max-w-6xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-medium text-ink">Sketch</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save sketch</Button>
          </div>
        </div>
        <div className="flex-1">
          <Excalidraw
            excalidrawAPI={(api) => { excalidrawRef.current = api; }}
            initialData={parsedInitial}
          />
        </div>
      </div>
    </div>
  );
}