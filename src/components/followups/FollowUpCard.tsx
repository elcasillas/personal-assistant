"use client";
import { useState } from "react";
import { MoreHorizontal, Copy, Trash2, Edit2, CalendarDays, User } from "lucide-react";
import { StatusPill } from "@/components/todo/ui/StatusPill";
import { PriorityPill } from "@/components/todo/ui/PriorityPill";
import { useFollowUpStore } from "@/store/useFollowUpStore";
import { formatDate, isOverdue, cn } from "@/lib/todo-utils";
import type { FollowUpItem } from "@/lib/followup-types";

interface FollowUpCardProps {
  item: FollowUpItem;
  onEdit: (item: FollowUpItem) => void;
  onDelete: (id: string) => void;
}

export function FollowUpCard({ item, onEdit, onDelete }: FollowUpCardProps) {
  const { updateItem, duplicateItem } = useFollowUpStore();
  const [showMenu, setShowMenu] = useState(false);
  const overdue = isOverdue(item.dueDate) && !item.completed;

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow", item.completed && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <input type="checkbox" checked={item.completed}
            onChange={() => updateItem(item.id, { completed: !item.completed, status: !item.completed ? "done" : "not_started" })}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-blue-500 flex-shrink-0 cursor-pointer" />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-slate-900 leading-snug", item.completed && "line-through text-slate-400")}>{item.subject}</p>
            {item.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{item.notes}</p>}
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[160px]">
              <button onClick={() => { onEdit(item); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit
              </button>
              <button onClick={() => { duplicateItem(item.id); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicate
              </button>
              <hr className="border-slate-100" />
              <button onClick={() => { onDelete(item.id); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill status={item.status} compact />
        <PriorityPill priority={item.priority} compact />
        {item.dueDate && (
          <span className={cn("flex items-center gap-1 text-[11px] font-medium", overdue ? "text-red-500" : "text-slate-500")}>
            <CalendarDays className="w-3 h-3" />
            {overdue && "Overdue · "}
            {formatDate(item.dueDate)}
          </span>
        )}
      </div>
      {item.contactName && (
        <div className="mt-3 flex items-center gap-1.5 pt-2.5 border-t border-slate-100">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500">{item.contactName}</span>
        </div>
      )}
    </div>
  );
}
