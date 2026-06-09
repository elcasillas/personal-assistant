"use client";

import { useEffect, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Note } from "@/lib/types";
import NoteForm from "./NoteForm";

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  async function fetchNotes() {
    try {
      setLoading(true);
      const res = await fetch("/api/notes");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to fetch notes");
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    fetchNotes();
  }

  function handleEdit(note: Note) {
    setEditingNote(note);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingNote(null);
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
          <h1 className="text-2xl font-semibold text-slate-900">Notes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{notes.length} notes</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">📝</div>
          <p className="text-slate-500 font-medium">No notes yet</p>
          <p className="text-slate-400 text-sm mt-1">Capture your first thought</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes
            .slice()
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((note) => (
              <div
                key={note.id}
                className="bg-white ring-1 ring-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleEdit(note)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm line-clamp-1 flex-1">
                    {note.title}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {note.content || "No content"}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">
                    {format(new Date(note.updatedAt), "MMM d")}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {formOpen && (
        <NoteForm
          note={editingNote}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); fetchNotes(); }}
        />
      )}
    </div>
  );
}
