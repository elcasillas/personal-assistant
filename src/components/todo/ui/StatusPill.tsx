import { cn } from "@/lib/todo-utils";
import type { TaskStatus } from "@/lib/todo-types";

export const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string; dotClass: string }> = {
  not_started: { label: "Not Started", className: "bg-slate-200 text-slate-600", dotClass: "bg-slate-400" },
  working: { label: "Working on it", className: "bg-amber-400 text-white", dotClass: "bg-amber-400" },
  done: { label: "Done", className: "bg-emerald-500 text-white", dotClass: "bg-emerald-500" },
  stuck: { label: "Stuck", className: "bg-red-500 text-white", dotClass: "bg-red-500" },
};

interface StatusPillProps {
  status: TaskStatus;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}

export function StatusPill({ status, onClick, compact, className }: StatusPillProps) {
  const config = STATUS_CONFIG[status];
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded transition-opacity select-none",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs w-full",
        config.className,
        onClick && "cursor-pointer hover:opacity-85 active:scale-95",
        !onClick && "cursor-default",
        className
      )}
    >
      {config.label}
    </Tag>
  );
}
