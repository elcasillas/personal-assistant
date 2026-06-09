"use client";

import { useEffect, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import type { FollowUp, FollowUpStatus } from "@/lib/types";
import FollowUpForm from "./FollowUpForm";

const statusBadge: Record<FollowUpStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

export default function FollowUpList() {
  const [followups, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  async function fetchFollowUps() {
    try {
      setLoading(true);
      const res = await fetch("/api/followups");
      if (!res.ok) throw new Error("Failed to fetch follow-ups");
      const data = await res.json();
      setFollowUps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFollowUps();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this follow-up?")) return;
    await fetch(`/api/followups?id=${id}`, { method: "DELETE" });
    fetchFollowUps();
  }

  async function toggleStatus(followup: FollowUp) {
    const newStatus: FollowUpStatus = followup.status === "pending" ? "completed" : "pending";
    await fetch("/api/followups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...followup, status: newStatus }),
    });
    fetchFollowUps();
  }

  function handleEdit(followup: FollowUp) {
    setEditingFollowUp(followup);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingFollowUp(null);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />
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

  const sorted = [...followups].sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Follow-ups</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {followups.filter((f) => f.status === "pending").length} pending
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Follow-up
        </button>
      </div>

      {followups.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">🤝</div>
          <p className="text-slate-500 font-medium">No follow-ups yet</p>
          <p className="text-slate-400 text-sm mt-1">Track your pending communications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((fu) => {
            const due = new Date(fu.dueDate);
            const overdue = fu.status === "pending" && isPast(due) && !isToday(due);
            return (
              <div
                key={fu.id}
                className={`bg-white ring-1 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${overdue ? "ring-red-200" : "ring-slate-200"}`}
                onClick={() => handleEdit(fu)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Toggle status */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(fu); }}
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        fu.status === "completed"
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      {fu.status === "completed" && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-sm ${fu.status === "completed" ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {fu.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{fu.contactName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[fu.status]}`}>
                      {fu.status}
                    </span>
                    <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
                      {overdue ? "Overdue · " : ""}
                      {format(due, "MMM d")}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(fu.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <FollowUpForm
          followup={editingFollowUp}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); fetchFollowUps(); }}
        />
      )}
    </div>
  );
}
