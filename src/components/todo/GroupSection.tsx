"use client";
import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Pencil, Trash2, Check, MessageCircle, GripVertical } from "lucide-react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskRow } from "./TaskRow";
import { TaskCard } from "./TaskCard";
import { useTodoStore } from "@/store/useTodoStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/todo-utils";
import type { Group, Task, HiddenColumns } from "@/lib/todo-types";

const ACCENT_COLORS = ["#3b82f6", "#22c55e", "#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4"];

interface GroupSectionProps {
  group: Group;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (groupId: string) => void;
  hiddenColumns: HiddenColumns;
  allGroups: Group[];
}

export function GroupSection({ group, tasks, onEditTask, onDeleteTask, onAddTask, hiddenColumns, allGroups }: GroupSectionProps) {
  const { toggleGroup, updateGroup, deleteGroup } = useTodoStore();
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setShowGroupMenu(false), showGroupMenu);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({ id: group.id, data: { type: "group" } });
  const dragStyle = { transform: CSS.Transform.toString(transform), transition };

  const commitName = () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== group.name) updateGroup(group.id, { name: trimmed });
    else setNameDraft(group.name);
  };

  const visibleColCount = 1 + 1 + 1 +
    (hiddenColumns.owner ? 0 : 1) + (hiddenColumns.status ? 0 : 1) +
    (hiddenColumns.dueDate ? 0 : 1) + (hiddenColumns.priority ? 0 : 1) +
    (hiddenColumns.notes ? 0 : 1) + 1;

  return (
    <div ref={setNodeRef} style={dragStyle} className={cn("mb-6", isDragging && "opacity-50")}>
      <div className="flex items-center gap-1.5 mb-2 px-1 group/header">
        <button {...listeners} {...attributes} tabIndex={-1} title="Drag to reorder"
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors opacity-0 group-hover/header:opacity-100">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => toggleGroup(group.id)} title={group.collapsed ? "Expand group" : "Collapse group"} className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer">
          {group.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {editingName ? (
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName} onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameDraft(group.name); setEditingName(false); } }}
            autoFocus className="text-sm font-bold border border-blue-400 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500/20" style={{ color: group.color }} />
        ) : (
          <button onClick={() => setEditingName(true)} className="text-sm font-bold hover:opacity-80 transition-opacity" style={{ color: group.color }}>
            {group.name}
          </button>
        )}
        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 font-medium">{tasks.length}</span>
        <div ref={menuRef} className="relative ml-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
          <button onClick={() => setShowGroupMenu(!showGroupMenu)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showGroupMenu && (
            <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-[180px] py-1">
              <button onClick={() => { setEditingName(true); setShowGroupMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Pencil className="w-3.5 h-3.5 text-slate-400" /> Rename group
              </button>
              <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} /> Change color
              </button>
              {showColorPicker && (
                <div className="px-3 py-2 flex flex-wrap gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button key={c} onClick={() => { updateGroup(group.id, { color: c }); setShowColorPicker(false); setShowGroupMenu(false); }}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110" style={{ backgroundColor: c }}>
                      {group.color === c && <Check className="w-3 h-3 text-white m-auto" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => onAddTask(group.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Plus className="w-3.5 h-3.5 text-slate-400" /> Add task
              </button>
              {allGroups.length > 1 && (
                <>
                  <hr className="border-slate-100 my-0.5" />
                  <button onClick={() => { deleteGroup(group.id); setShowGroupMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" /> Delete group
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!group.collapsed && (
        <>
          <div className={cn("hidden sm:block rounded-xl border border-slate-200 overflow-hidden transition-colors", isOver && "ring-2 ring-blue-400 ring-offset-1")}
            style={{ borderLeftWidth: 3, borderLeftColor: group.color }}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[640px] table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-10 pl-2 pr-1" />
                    <th className="py-2.5 px-3 w-56 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Task</th>
                    <th className="py-2.5 px-1 w-14 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider"><MessageCircle className="w-3.5 h-3.5 mx-auto" /></th>
                    {!hiddenColumns.owner && <th className="py-2.5 px-1 w-14 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Owner</th>}
                    {!hiddenColumns.status && <th className="py-2.5 px-2 w-[128px] text-center text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Status</th>}
                    {!hiddenColumns.dueDate && <th className="py-2.5 px-2 w-24 text-center text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Due date</th>}
                    {!hiddenColumns.priority && <th className="py-2.5 px-2 w-24 text-center text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Priority</th>}
                    {!hiddenColumns.notes && <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Notes</th>}
                    <th className="w-9" />
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                      <TaskRow key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} hiddenColumns={hiddenColumns} groups={allGroups} />
                    ))}
                  </SortableContext>
                  {tasks.length === 0 && (
                    <tr><td colSpan={visibleColCount} className="py-8 text-center text-sm text-slate-400">No tasks in this group yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 bg-white">
              <button onClick={() => onAddTask(group.id)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors w-full text-left">
                <Plus className="w-3.5 h-3.5" /> Add task
              </button>
            </div>
          </div>
          <div className="sm:hidden space-y-2.5">
            {tasks.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">No tasks in this group yet.</p>
            ) : (
              tasks.map((task) => <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />)
            )}
            <button onClick={() => onAddTask(group.id)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-blue-600 transition-colors">
              <Plus className="w-4 h-4" /> Add task
            </button>
          </div>
        </>
      )}
    </div>
  );
}
