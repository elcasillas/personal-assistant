"use client";

import { useEffect, useState } from "react";
import { Plus, Play, Pencil, Trash2, ToggleLeft, ToggleRight, Clock, History } from "lucide-react";
import { useRoutineStore } from "@/store/useRoutineStore";
import type { Routine, RoutineRun } from "@/lib/types";
import RoutineForm from "./RoutineForm";
import RunResultModal from "./RunResultModal";
import RunHistoryModal from "./RunHistoryModal";

export default function RoutineList() {
  const {
    routines, loading, error,
    loadData, createRoutine, updateRoutine, deleteRoutine, updateLastRunAt, prependRun,
  } = useRoutineStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Routine | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Run result state
  const [runRoutine, setRunRoutine] = useState<Routine | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [completedRun, setCompletedRun] = useState<RoutineRun | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // History state
  const [historyRoutine, setHistoryRoutine] = useState<Routine | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave(
    data: Omit<Routine, "id" | "userId" | "lastRunAt" | "createdAt" | "updatedAt">
  ) {
    if (editTarget) {
      await updateRoutine(editTarget.id, data);
    } else {
      await createRoutine(data);
    }
    setEditTarget(null);
  }

  async function handleToggleActive(routine: Routine) {
    await updateRoutine(routine.id, { active: !routine.active });
  }

  async function handleDelete(id: string) {
    await deleteRoutine(id);
    setDeleteConfirm(null);
  }

  async function handleRun(routine: Routine) {
    setRunRoutine(routine);
    setRunLoading(true);
    setCompletedRun(null);
    setRunError(null);

    try {
      const res = await fetch(`/api/routines/${routine.id}/run`, { method: "POST" });
      const data = await res.json() as { run?: RoutineRun; error?: string };

      if (data.run) {
        setCompletedRun(data.run);
        updateLastRunAt(routine.id, data.run.completedAt ?? data.run.createdAt);
        prependRun(routine.id, data.run);
      } else {
        setRunError(data.error ?? "Routine failed.");
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunLoading(false);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Routines</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated instructions Linda can run on demand or by trigger phrase.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Routine
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Loading routines…</div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && routines.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No routines yet.</p>
          <p className="text-xs mt-1">Click &ldquo;New Routine&rdquo; to create your first one.</p>
        </div>
      )}

      {!loading && routines.length > 0 && (
        <div className="space-y-3">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900">{routine.name}</h3>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        routine.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {routine.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {routine.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{routine.description}</p>
                  )}

                  {routine.triggerPhrases.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {routine.triggerPhrases.slice(0, 4).map((phrase) => (
                        <span
                          key={phrase}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          &ldquo;{phrase}&rdquo;
                        </span>
                      ))}
                      {routine.triggerPhrases.length > 4 && (
                        <span className="text-xs text-slate-400">
                          +{routine.triggerPhrases.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last run: {formatDate(routine.lastRunAt)}</span>
                    {routine.dataSources.length > 0 && (
                      <>
                        <span className="mx-1">·</span>
                        <span>Sources: {routine.dataSources.join(", ")}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => handleRun(routine)}
                    title="Run routine"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run
                  </button>

                  <button
                    onClick={() => setHistoryRoutine(routine)}
                    title="View run history"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    History
                  </button>

                  <button
                    onClick={() => handleToggleActive(routine)}
                    title={routine.active ? "Deactivate" : "Activate"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    {routine.active ? (
                      <ToggleRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => { setEditTarget(routine); setFormOpen(true); }}
                    title="Edit"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirm(routine.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Delete routine?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete the routine and its run history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit form */}
      {formOpen && (
        <RoutineForm
          routine={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditTarget(null); }}
        />
      )}

      {/* Run result modal */}
      {runRoutine && (
        <RunResultModal
          routine={runRoutine}
          loading={runLoading}
          run={completedRun}
          error={runError}
          onClose={() => { setRunRoutine(null); setCompletedRun(null); setRunError(null); }}
          onViewHistory={() => {
            if (runRoutine) setHistoryRoutine(runRoutine);
          }}
        />
      )}

      {/* Run history modal */}
      {historyRoutine && (
        <RunHistoryModal
          routine={historyRoutine}
          onClose={() => setHistoryRoutine(null)}
        />
      )}
    </div>
  );
}
