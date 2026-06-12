"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, Clock, ChevronLeft, RefreshCw, Trash2 } from "lucide-react";
import type { Routine, RoutineRun } from "@/lib/types";
import { useRoutineStore } from "@/store/useRoutineStore";

interface RunHistoryModalProps {
  routine: Routine;
  onClose: () => void;
}

function statusBadge(status: RoutineRun["status"]) {
  if (status === "success")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Success
      </span>
    );
  if (status === "failed")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" />
      Running
    </span>
  );
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstLine(text: string, max = 120) {
  const line = text.split("\n").find((l) => l.trim()) ?? "";
  return line.length > max ? line.slice(0, max) + "…" : line;
}

export default function RunHistoryModal({ routine, onClose }: RunHistoryModalProps) {
  const { runHistory, runHistoryLoading, loadRunHistory, deleteRun } = useRoutineStore();
  const [selectedRun, setSelectedRun] = useState<RoutineRun | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const runs = runHistory[routine.id] ?? [];
  const loading = runHistoryLoading[routine.id] ?? false;

  useEffect(() => {
    loadRunHistory(routine.id);
  }, [routine.id, loadRunHistory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {selectedRun && (
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors -ml-1.5"
                aria-label="Back to list"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {selectedRun ? "Run Detail" : "Run History"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
                {routine.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!selectedRun && (
              <button
                onClick={() => loadRunHistory(routine.id)}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                aria-label="Refresh history"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── List view ── */}
          {!selectedRun && (
            <>
              {loading && (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading history…
                </div>
              )}

              {!loading && runs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Clock className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No runs yet</p>
                  <p className="text-xs mt-1">
                    Click &ldquo;Run&rdquo; on this routine to execute it.
                  </p>
                </div>
              )}

              {!loading && runs.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <li key={run.id} className="flex items-stretch">
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="flex-1 text-left px-6 py-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {statusBadge(run.status)}
                              <span className="text-xs text-slate-500">
                                {formatDateTime(run.completedAt ?? run.createdAt)}
                              </span>
                            </div>
                            {run.status === "success" && run.output && (
                              <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 font-mono leading-relaxed">
                                {firstLine(run.output)}
                              </p>
                            )}
                            {run.status === "failed" && run.error && (
                              <p className="text-xs text-red-600 mt-1.5 line-clamp-1">
                                {run.error}
                              </p>
                            )}
                          </div>
                          <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0 mt-0.5" />
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(run.id); setDeleteError(null); }}
                        className="px-3 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors border-l border-slate-100"
                        aria-label="Delete run"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ── Detail view ── */}
          {selectedRun && (
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  {statusBadge(selectedRun.status)}
                  <span className="text-xs text-slate-500">
                    Started: {formatDateTime(selectedRun.startedAt)}
                  </span>
                  <span className="text-xs text-slate-500">
                    Completed: {formatDateTime(selectedRun.completedAt)}
                  </span>
                </div>
                <button
                  onClick={() => { setConfirmDeleteId(selectedRun.id); setDeleteError(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              {selectedRun.status === "failed" && selectedRun.error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{selectedRun.error}</span>
                </div>
              )}

              {selectedRun.output && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedRun.output}
                  </pre>
                </div>
              )}

              {selectedRun.outputFormatSnapshot && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 select-none">
                    Output format used in this run
                  </summary>
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedRun.outputFormatSnapshot}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Confirm delete dialog */}
        {confirmDeleteId && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
            <div className="bg-white rounded-xl shadow-xl mx-4 p-6 max-w-sm w-full space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Delete this summary?</h3>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete this historical summary? This action cannot be undone.
              </p>
              {deleteError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {deleteError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await deleteRun(routine.id, confirmDeleteId);
                      if (selectedRun?.id === confirmDeleteId) setSelectedRun(null);
                      setConfirmDeleteId(null);
                    } catch (err) {
                      setDeleteError(err instanceof Error ? err.message : "Delete failed");
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-40"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {!selectedRun && runs.length > 0
              ? `${runs.length} run${runs.length !== 1 ? "s" : ""} — most recent first`
              : ""}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
