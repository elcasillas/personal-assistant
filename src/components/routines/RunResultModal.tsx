"use client";

import { X, Loader2, AlertCircle, CheckCircle2, History } from "lucide-react";
import type { Routine, RoutineRun } from "@/lib/types";

interface RunResultModalProps {
  routine: Routine;
  loading: boolean;
  run: RoutineRun | null;
  error: string | null;
  onClose: () => void;
  onViewHistory: () => void;
}

export default function RunResultModal({
  routine,
  loading,
  run,
  error,
  onClose,
  onViewHistory,
}: RunResultModalProps) {
  const saved = run !== null;
  const failed = run?.status === "failed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{routine.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {loading && <p className="text-xs text-slate-500">Running…</p>}
              {saved && !failed && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Result saved to history
                </span>
              )}
              {saved && failed && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Failed run saved to history
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-sm">Running routine…</p>
            </div>
          )}

          {!loading && failed && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{run?.error ?? error ?? "Routine failed."}</span>
            </div>
          )}

          {!loading && run?.output && !failed && (
            <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
              {run.output}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          {saved ? (
            <button
              onClick={() => { onClose(); onViewHistory(); }}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <History className="w-4 h-4" />
              View run history
            </button>
          ) : (
            <span />
          )}
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
