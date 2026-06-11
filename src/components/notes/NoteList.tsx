"use client";

import { useEffect, useState } from "react";
import { Plus, AlertCircle, Archive, ArchiveRestore, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import type { Note } from "@/lib/types";
import NoteForm from "./NoteForm";
import { useToastStore } from "@/store/useToastStore";

export default function NoteList() {
  const [view, setView] = useState<"active" | "archived">("active");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { addToast } = useToastStore();

  async function fetchNotes() {
    try {
      setLoading(true);
      const url = view === "archived" ? "/api/notes?archived=true" : "/api/notes";
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to fetch notes");
      }
      setNotes(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    addToast("Note deleted");
  }

  async function handleArchive(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived: true }),
      });
      if (!res.ok) throw new Error();
      addToast("Note archived — find it in Archived Notes");
    } catch {
      fetchNotes();
      addToast("Failed to archive note", "error");
    }
  }

  async function handleUnarchive(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived: false }),
      });
      if (!res.ok) throw new Error();
      addToast("Note moved back to Notes");
    } catch {
      fetchNotes();
      addToast("Failed to unarchive note", "error");
    }
  }

  function handleEdit(note: Note) {
    setEditingNote(note);
    setFormOpen(true);
  }

  function switchView(next: "active" | "archived") {
    setView(next);
    setNotes([]);
    setError(null);
  }

  const isArchived = view === "archived";

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-20">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isArchived && (
            <button
              onClick={() => switchView("active")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Back to Notes"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {isArchived ? "Archived Notes" : "Notes"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {notes.length} {isArchived ? "archived" : ""}{" "}
              {notes.length === 1 ? "note" : "notes"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isArchived && (
            <>
              <button
                onClick={() => switchView("archived")}
                className="flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {notes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">
            {isArchived ? "🗂️" : "📝"}
          </div>
          <p className="text-slate-500 font-medium">
            {isArchived ? "No archived notes" : "No notes yet"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isArchived
              ? "Notes you archive will appear here"
              : "Capture your first thought"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`bg-white ring-1 ring-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
                isArchived ? "opacity-80 hover:opacity-100" : ""
              }`}
              onClick={() => handleEdit(note)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3
                  className={`font-semibold text-sm line-clamp-1 flex-1 ${
                    isArchived ? "text-slate-600" : "text-slate-900"
                  }`}
                >
                  {note.title}
                </h3>

                {/* Active note actions */}
                {!isArchived && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArchive(note.id); }}
                      title="Archive note"
                      className="text-slate-400 hover:text-amber-500 transition-colors p-0.5"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                      title="Delete note"
                      className="text-slate-300 hover:text-red-500 transition-colors text-xs leading-none p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Archived note action */}
                {isArchived && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnarchive(note.id); }}
                    title="Unarchive note"
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p
                className={`text-xs line-clamp-3 leading-relaxed ${
                  isArchived ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {note.content || "No content"}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        isArchived
                          ? "bg-slate-100 text-slate-500"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-slate-400 shrink-0 ml-2">
                  {isArchived && note.archivedAt
                    ? `Archived ${format(new Date(note.archivedAt), "MMM d")}`
                    : format(new Date(note.updatedAt), "MMM d")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <NoteForm
          note={editingNote}
          onClose={() => { setFormOpen(false); setEditingNote(null); }}
          onSuccess={() => { setFormOpen(false); setEditingNote(null); fetchNotes(); }}
        />
      )}
    </div>
  );
}
