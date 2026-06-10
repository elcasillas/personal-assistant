import { cn } from "@/lib/todo-utils";
import type { TaskPriority } from "@/lib/todo-types";

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string; dotClass: string }> = {
  low: { label: "Low", className: "bg-sky-400 text-white", dotClass: "bg-sky-400" },
  medium: { label: "Medium", className: "bg-violet-500 text-white", dotClass: "bg-violet-500" },
  high: { label: "High", className: "bg-indigo-700 text-white", dotClass: "bg-indigo-700" },
  urgent: { label: "Urgent", className: "bg-rose-600 text-white", dotClass: "bg-rose-600" },
};

interface PriorityPillProps {
  priority: TaskPriority;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}

export function PriorityPill({ priority, onClick, compact, className }: PriorityPillProps) {
  const config = PRIORITY_CONFIG[priority];
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
