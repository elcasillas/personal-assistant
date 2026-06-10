"use client";
import { useState, useRef, useEffect } from "react";
import { Loader2, MessageSquare, Pencil, Trash2, Check, X, AlertCircle } from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { formatRelativeTime } from "@/lib/todo-utils";
import { useTodoStore } from "@/store/useTodoStore";
import type { TaskUpdate } from "@/lib/todo-types";

interface TaskUpdateListProps {
  updates: TaskUpdate[];
  loading: boolean;
}

export function TaskUpdateList({ updates, loading }: TaskUpdateListProps) {
  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>;
  }
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <MessageSquare className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700 mb-1">No updates yet</p>
        <p className="text-xs text-slate-400">Be the first to post an update for this task.</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100">
      {updates.map((u) => <UpdateItem key={u.id} update={u} />)}
    </div>
  );
}

function isEdited(update: TaskUpdate): boolean {
  return new Date(update.updatedAt).getTime() - new Date(update.createdAt).getTime() > 2000;
}

function UpdateItem({ update }: { update: TaskUpdate }) {
  const { editTaskUpdate, deleteTaskUpdate } = useTodoStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(update.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { if (!editing) setDraft(update.content); }, [update.content, editing]);
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  const startEdit = () => { setConfirmDelete(false); setDeleteError(null); setDraft(update.content); setEditing(true); };
  const cancel = () => { setEditing(false); setDraft(update.content); };
  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed === update.content) { cancel(); return; }
    editTaskUpdate(update.id, update.taskId, trimmed);
    setEditing(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
  };
  const requestDelete = () => { setEditing(false); setDeleteError(null); setConfirmDelete(true); };
  const cancelDelete = () => setConfirmDelete(false);
  const confirmAndDelete = async () => {
    setDeleting(true); setDeleteError(null);
    const err = await deleteTaskUpdate(update.id, update.taskId);
    if (err) { setDeleteError(err); setDeleting(false); setConfirmDelete(false); }
  };

  const edited = isEdited(update);
  const canSave = draft.trim() !== update.content && draft.trim().length > 0;

  return (
    <div className="group flex gap-3 px-4 py-4">
      <Avatar owner={{ name: update.authorName, initials: update.authorInitials, color: update.authorColor }} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-slate-800 shrink-0">{update.authorName}</span>
          <span className="text-xs text-slate-400 shrink-0">{formatRelativeTime(update.createdAt)}</span>
          {edited && !editing && <span className="text-xs text-slate-400 italic shrink-0">Edited</span>}
          {!editing && !confirmDelete && (
            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={startEdit} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Edit update">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={requestDelete} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete update">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          {!editing && confirmDelete && (
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500">Delete this update?</span>
              <button onClick={confirmAndDelete} disabled={deleting}
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded transition-colors">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
              </button>
              <button onClick={cancelDelete} disabled={deleting} className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors">Cancel</button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea ref={textareaRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown}
              rows={3} className="w-full text-sm text-slate-700 leading-relaxed border border-blue-400 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            <div className="flex items-center gap-2">
              <button onClick={save} disabled={!canSave}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-md transition-colors">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={cancel} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-3 h-3" /> Cancel
              </button>
              <span className="text-xs text-slate-400 ml-auto hidden sm:inline">⌘↵ save · Esc cancel</span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{update.content}</p>
            {deleteError && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span className="flex-1">{deleteError}</span>
                <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
