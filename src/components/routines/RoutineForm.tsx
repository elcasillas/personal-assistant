"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Routine } from "@/lib/types";

const DATA_SOURCE_OPTIONS = ["Tasks", "Follow-ups", "Notes", "Drafts", "Contacts"];

interface RoutineFormProps {
  routine?: Routine;
  onSave: (data: Omit<Routine, "id" | "userId" | "lastRunAt" | "createdAt" | "updatedAt">) => Promise<void>;
  onClose: () => void;
}

export default function RoutineForm({ routine, onSave, onClose }: RoutineFormProps) {
  const [name, setName] = useState(routine?.name ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [triggerPhrasesText, setTriggerPhrasesText] = useState(
    (routine?.triggerPhrases ?? []).join("\n")
  );
  const [instructions, setInstructions] = useState(routine?.instructions ?? "");
  const [dataSources, setDataSources] = useState<string[]>(routine?.dataSources ?? []);
  const [outputFormat, setOutputFormat] = useState(routine?.outputFormat ?? "");
  const [active, setActive] = useState(routine?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDataSource(source: string) {
    setDataSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Routine name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const triggerPhrases = triggerPhrasesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await onSave({ name: name.trim(), description, triggerPhrases, instructions, dataSources, outputFormat, active });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save routine.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {routine ? "Edit Routine" : "New Routine"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Routine Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Due and Overdue Summary"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of what this routine does"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Trigger Phrases
              <span className="ml-1.5 text-xs font-normal text-slate-400">(one per line)</span>
            </label>
            <textarea
              value={triggerPhrasesText}
              onChange={(e) => setTriggerPhrasesText(e.target.value)}
              rows={4}
              placeholder={"What's due today?\nGive me my daily summary\nWhat is late?"}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data Sources
            </label>
            <div className="flex flex-wrap gap-2">
              {DATA_SOURCE_OPTIONS.map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleDataSource(source)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    dataSources.includes(source)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Instructions / Logic
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder="Describe what Linda should do when this routine runs…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Output Format
            </label>
            <textarea
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              rows={5}
              placeholder="Describe or show the format Linda should use for the response…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-slate-700">{active ? "Active" : "Inactive"}</span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : routine ? "Save Changes" : "Create Routine"}
          </button>
        </div>
      </div>
    </div>
  );
}
