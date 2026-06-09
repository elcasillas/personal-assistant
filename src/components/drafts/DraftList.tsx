"use client";

import { useEffect, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Draft, DraftType } from "@/lib/types";
import DraftForm from "./DraftForm";

const typeBadge: Record<DraftType, string> = {
  email: "bg-blue-100 text-blue-700",
  letter: "bg-purple-100 text-purple-700",
  memo: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

export default function DraftList() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);

  async function fetchDrafts() {
    try {
      setLoading(true);
      const res = await fetch("/api/drafts");
      if (!res.ok) throw new Error("Failed to fetch drafts");
      const data = await res.json();
      setDrafts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDrafts();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this draft?")) return;
    await fetch(`/api/drafts?id=${id}`, { method: "DELETE" });
    fetchDrafts();
  }

  function handleEdit(draft: Draft) {
    setEditingDraft(draft);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingDraft(null);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
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
          <h1 className="text-2xl font-semibold text-slate-900">Drafts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{drafts.length} drafts</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Draft
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">✉️</div>
          <p className="text-slate-500 font-medium">No drafts yet</p>
          <p className="text-slate-400 text-sm mt-1">Start drafting communications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts
            .slice()
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((draft) => (
              <div
                key={draft.id}
                className="bg-white ring-1 ring-slate-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleEdit(draft)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[draft.type]}`}>
                        {draft.type}
                      </span>
                      <span className="font-medium text-slate-900 text-sm line-clamp-1">
                        {draft.subject}
                      </span>
                    </div>
                    {draft.to && (
                      <p className="text-xs text-slate-500">To: {draft.to}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {draft.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">
                      {format(new Date(draft.updatedAt), "MMM d")}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(draft.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {formOpen && (
        <DraftForm
          draft={editingDraft}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); fetchDrafts(); }}
        />
      )}
    </div>
  );
}
