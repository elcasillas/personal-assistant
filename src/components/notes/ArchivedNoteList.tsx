"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import type { Note } from "@/lib/types";
import NoteForm from "./NoteForm";
import { useToastStore } from "@/store/useToastStore";

export default function ArchivedNoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { addToast } = useToastStore();

  async function fetchNotes() {
    try {
      setLoading(true);
      const res = await fetch("/api/notes?archived=true");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to fetch archived notes");
      }
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  async function handleUnarchive(id: string) {
    // Optimistic remove from archived list
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived: false }),
      });
      if (!res.ok) throw new Error("Failed to unarchive note");
      addToast("Note moved back to Notes");
    } catch {
      fetchNotes(); // revert
      addToast("Failed to unarchive note", "error");
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Archived Notes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {notes.length} archived {notes.length === 1 ? "note" : "notes"}
          </p>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">🗂️</div>
          <p className="text-slate-500 font-medium">No archived notes</p>
          <p className="text-slate-400 text-sm mt-1">
            Notes you archive will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white ring-1 ring-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group opacity-80 hover:opacity-100"
              onClick={() => setEditingNote(note)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-slate-700 text-sm line-clamp-1 flex-1">
                  {note.title}
                </h3>
                <button
                  onClick={(e) => { e.stopPropagation(); handleUnarchive(note.id); }}
                  title="Unarchive note"
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {note.content || "No content"}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-right ml-2 shrink-0">
                  {note.archivedAt && (
                    <span className="text-xs text-slate-400 block">
                      Archived {format(new Date(note.archivedAt), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingNote && (
        <NoteForm
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSuccess={() => { setEditingNote(null); fetchNotes(); }}
        />
      )}
    </div>
  );
}
