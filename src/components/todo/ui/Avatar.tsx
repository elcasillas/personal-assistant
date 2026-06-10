import { cn, getContrastColor } from "@/lib/todo-utils";
import { User } from "lucide-react";
import type { TaskOwner } from "@/lib/todo-types";

interface AvatarProps {
  owner?: TaskOwner | null;
  size?: "sm" | "md";
  className?: string;
}

export function Avatar({ owner, size = "sm", className }: AvatarProps) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  if (!owner) {
    return (
      <div className={cn("rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0", dim, className)}>
        <User className={cn(iconSize, "text-slate-400")} />
      </div>
    );
  }

  if (owner.avatar) {
    return (
      <img src={owner.avatar} alt={owner.name} title={owner.name}
        className={cn("rounded-full object-cover flex-shrink-0", dim, className)} />
    );
  }

  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-semibold flex-shrink-0 select-none", dim, textSize, className)}
      style={{ backgroundColor: owner.color, color: getContrastColor(owner.color) }}
      title={owner.name}
    >
      {owner.initials}
    </div>
  );
}
