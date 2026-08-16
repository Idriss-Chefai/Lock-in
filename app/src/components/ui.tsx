import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("bg-surface border border-border rounded-xl p-5", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-accent text-white hover:opacity-90",
        variant === "secondary" &&
          "bg-surface-raised text-ink border border-border hover:bg-surface-sunken",
        variant === "ghost" && "text-ink-muted hover:bg-surface-raised hover:text-ink",
        variant === "danger" && "text-danger hover:bg-danger/10",
        className
      )}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40",
        className
      )}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none",
        className
      )}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-ink-muted">{label}</span>
        <span className="text-sm font-medium text-ink">{value ?? "—"}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden">
      <div
        className="h-full bg-accent rounded-full transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        tone === "neutral" && "bg-surface-raised text-ink-muted",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "danger" && "bg-danger/10 text-danger",
        tone === "accent" && "bg-accent-muted text-accent"
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-ink-faint py-6 text-center">{message}</p>;
}
