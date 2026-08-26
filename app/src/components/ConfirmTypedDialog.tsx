import { useState } from "react";
import { Button, Input } from "./ui";

interface ConfirmTypedDialogProps {
  title: string;
  body: string;
  expectedValue: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmTypedDialog({
  title,
  body,
  expectedValue,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmTypedDialogProps) {
  const [typed, setTyped] = useState(expectedValue);
  const matches = typed.trim() === expectedValue;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-6 animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-muted mt-2">{body}</p>
        <Input
          autoFocus
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && matches) onConfirm();
            if (event.key === "Escape") onCancel();
          }}
          className="mt-4 w-full"
        />
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1 justify-center" disabled={!matches} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}