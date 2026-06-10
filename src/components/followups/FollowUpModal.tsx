"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useFollowUpStore } from "@/store/useFollowUpStore";
import { cn } from "@/lib/todo-utils";
import { STATUS_CONFIG } from "@/components/todo/ui/StatusPill";
import { PRIORITY_CONFIG } from "@/components/todo/ui/PriorityPill";
import type { FollowUpItem, FollowUpStatus, FollowUpPriority } from "@/lib/followup-types";

const STATUSES = Object.keys(STATUS_CONFIG) as FollowUpStatus[];
const PRIORITIES = Object.keys(PRIORITY_CONFIG) as FollowUpPriority[];

interface FollowUpModalProps {
  item?: FollowUpItem | null;
  defaultGroupId?: string;
  onClose: () => void;
}

export function FollowUpModal({ item, defaultGroupId, onClose }: FollowUpModalProps) {
  const { groups, addItem, updateItem } = useFollowUpStore();
  const isEdit = !!item;

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  const fallbackGroupId = sortedGroups[0]?.id || "";

  const [subject, setSubject] = useState(item?.subject || "");
  const [contactName, setContactName] = useState(item?.contactName || "");
  const [status, setStatus] = useState<FollowUpStatus>(item?.status || "not_started");
  const [dueDate, setDueDate] = useState(item?.dueDate || "");
  const [priority, setPriority] = useState<FollowUpPriority>(item?.priority || "medium");
  const [notes, setNotes] = useState(item?.notes || "");
  const [groupId, setGroupId] = useState(item?.groupId || defaultGroupId || fallbackGroupId);
  const [subjectError, setSubjectError] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { setSubjectError(true); return; }

    const payload = {
      subject: subject.trim(),
      contactName: contactName.trim(),
      status,
      dueDate: dueDate || null,
      priority,
      notes: notes.trim(),
      completed: status === "done",
      groupId,
    };

    if (isEdit && item) updateItem(item.id, payload);
    else addItem(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? "Edit follow-up" : "New follow-up"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Subject <span className="text-red-500">*</span></label>
              <input type="text" value={subject} onChange={(e) => { setSubject(e.target.value); setSubjectError(false); }}
                placeholder="What to follow up about?" autoFocus
                className={cn("w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 transition",
                  subjectError ? "border-red-400 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-400")} />
              {subjectError && <p className="text-xs text-red-500 mt-1">Subject is required.</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Contact Name</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                  placeholder="Who to follow up with"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Group</label>
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition">
                  {sortedGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
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
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional context…"
                rows={3} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none" />
            </div>
          </div>
          <div className="flex gap-2.5 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
              {isEdit ? "Save changes" : "Create follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
