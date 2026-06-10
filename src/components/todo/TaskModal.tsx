"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTodoStore } from "@/store/useTodoStore";
import { generateInitials, getAvatarColor, cn } from "@/lib/todo-utils";
import { STATUS_CONFIG } from "./ui/StatusPill";
import { PRIORITY_CONFIG } from "./ui/PriorityPill";
import type { Task, TaskStatus, TaskPriority, TodoOwner } from "@/lib/todo-types";

const STATUSES = Object.keys(STATUS_CONFIG) as TaskStatus[];
const PRIORITIES = Object.keys(PRIORITY_CONFIG) as TaskPriority[];

interface TaskModalProps {
  task?: Task | null;
  defaultGroupId?: string;
  onClose: () => void;
}

export function TaskModal({ task, defaultGroupId, onClose }: TaskModalProps) {
  const { groups, addTask, updateTask, currentUser } = useTodoStore();
  const isEdit = !!task;

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  const fallbackGroupId = sortedGroups[0]?.id || "";

  const [title, setTitle] = useState(task?.title || "");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "not_started");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
  const [notes, setNotes] = useState(task?.notes || "");
  const [groupId, setGroupId] = useState(task?.groupId || defaultGroupId || fallbackGroupId);
  const [titleError, setTitleError] = useState(false);

  const [owners, setOwners] = useState<TodoOwner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [ownersError, setOwnersError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/todo/owners");
        if (!res.ok) throw new Error(`${res.status}`);
        const data: TodoOwner[] = await res.json();
        if (cancelled) return;
        setOwners(data);
        if (!isEdit) {
          const self = data.find((o) => o.name === currentUser?.name);
          setSelectedOwnerId(self?.id ?? "");
        } else {
          const match = data.find((o) => o.name === task?.owner?.name);
          setSelectedOwnerId(match?.id ?? "");
        }
      } catch {
        if (!cancelled) setOwnersError(true);
      } finally {
        if (!cancelled) setOwnersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setTitleError(true); return; }

    const selectedOwner = owners.find((o) => o.id === selectedOwnerId);
    const owner = selectedOwner
      ? { name: selectedOwner.name, initials: generateInitials(selectedOwner.name), color: selectedOwner.color || getAvatarColor(selectedOwner.name) }
      : null;

    const payload = { title: title.trim(), owner, status, dueDate: dueDate || null, priority, notes: notes.trim(), completed: status === "done", groupId };

    if (isEdit && task) updateTask(task.id, payload);
    else addTask(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? "Edit task" : "New task"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Task name <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
                placeholder="What needs to be done?" autoFocus
                className={cn("w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 transition",
                  titleError ? "border-red-400 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-400")} />
              {titleError && <p className="text-xs text-red-500 mt-1">Task name is required.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Group</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition">
                {sortedGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Status</label>
                <div className="space-y-1.5">
                  {STATUSES.map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(s)}
                      className={cn("w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all",
                        STATUS_CONFIG[s].className, status === s ? "ring-2 ring-offset-1 ring-blue-500 scale-[1.02]" : "opacity-50 hover:opacity-80")}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Priority</label>
                <div className="space-y-1.5">
                  {PRIORITIES.map((p) => (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className={cn("w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all",
                        PRIORITY_CONFIG[p].className, priority === p ? "ring-2 ring-offset-1 ring-blue-500 scale-[1.02]" : "opacity-50 hover:opacity-80")}>
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Owner</label>
                {ownersError ? (
                  <div className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400 italic">Unable to load users</div>
                ) : (
                  <select value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)} disabled={ownersLoading}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {ownersLoading ? (
                      <option value="">Loading users…</option>
                    ) : (
                      <>
                        <option value="">— No owner —</option>
                        {owners.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}{o.name === currentUser?.name ? " (You)" : ""}</option>
                        ))}
                      </>
                    )}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional context…"
                rows={3} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none" />
            </div>
          </div>
          <div className="flex gap-2.5 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
              {isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
