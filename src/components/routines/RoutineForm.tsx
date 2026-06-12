"use client";

import { useMemo, useState } from "react";
import { X, CalendarClock } from "lucide-react";
import type { Routine } from "@/lib/types";
import type { SchedulePayload } from "@/store/useRoutineStore";
import {
  COMMON_TIMEZONES,
  WEEKDAYS,
  type ScheduleFrequency,
  buildCronExpression,
  describeCron,
  getNextRunDate,
  formatNextRun,
  validateCronExpression,
} from "@/lib/cron-utils";

const DATA_SOURCE_OPTIONS = ["Tasks", "Follow-ups", "Notes", "Drafts", "Contacts"];

interface RoutineFormProps {
  routine?: Routine;
  onSave: (
    data: Omit<Routine, "id" | "userId" | "lastRunAt" | "createdAt" | "updatedAt">
  ) => Promise<{ id: string }>;
  onScheduleSave: (id: string, data: SchedulePayload) => Promise<{ cfUpdated: boolean; cfError: string | null }>;
  onClose: () => void;
}

export default function RoutineForm({ routine, onSave, onScheduleSave, onClose }: RoutineFormProps) {
  // General fields
  const [name, setName] = useState(routine?.name ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [triggerPhrasesText, setTriggerPhrasesText] = useState(
    (routine?.triggerPhrases ?? []).join("\n")
  );
  const [instructions, setInstructions] = useState(routine?.instructions ?? "");
  const [dataSources, setDataSources] = useState<string[]>(routine?.dataSources ?? []);
  const [outputFormat, setOutputFormat] = useState(routine?.outputFormat ?? "");
  const [active, setActive] = useState(routine?.active ?? true);

  // Schedule fields
  const [scheduleEnabled, setScheduleEnabled] = useState(routine?.scheduleEnabled ?? false);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>(
    (routine?.scheduleFrequency as ScheduleFrequency) ?? "daily"
  );
  const [scheduleTime, setScheduleTime] = useState(routine?.scheduleTime ?? "07:00");
  const [scheduleWeekday, setScheduleWeekday] = useState(routine?.scheduleWeekday ?? 1);
  const [scheduleMonthDay, setScheduleMonthDay] = useState(routine?.scheduleMonthDay ?? 1);
  const [scheduleTimezone, setScheduleTimezone] = useState(
    routine?.scheduleTimezone ?? "America/New_York"
  );
  const [customCron, setCustomCron] = useState(
    scheduleFrequency === "custom" ? (routine?.scheduleCron ?? "") : ""
  );
  const [cronValidationError, setCronValidationError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cfWarning, setCfWarning] = useState<string | null>(null);

  function toggleDataSource(source: string) {
    setDataSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }

  const computedCron = useMemo(() => {
    if (!scheduleEnabled) return null;
    if (scheduleFrequency === "custom") {
      if (!customCron.trim()) return null;
      const v = validateCronExpression(customCron);
      return v.valid ? customCron.trim() : null;
    }
    try {
      return buildCronExpression(scheduleFrequency, scheduleTime, scheduleTimezone, scheduleWeekday, scheduleMonthDay);
    } catch {
      return null;
    }
  }, [scheduleEnabled, scheduleFrequency, scheduleTime, scheduleTimezone, scheduleWeekday, scheduleMonthDay, customCron]);

  const cronDescription = useMemo(() => {
    if (!scheduleEnabled) return "";
    return describeCron(scheduleFrequency, scheduleTime, scheduleTimezone, scheduleWeekday, scheduleMonthDay, customCron);
  }, [scheduleEnabled, scheduleFrequency, scheduleTime, scheduleTimezone, scheduleWeekday, scheduleMonthDay, customCron]);

  const nextRunDate = useMemo(() => {
    if (!scheduleEnabled || scheduleFrequency === "custom") return null;
    return getNextRunDate(scheduleFrequency, scheduleTime, scheduleTimezone, scheduleWeekday, scheduleMonthDay);
  }, [scheduleEnabled, scheduleFrequency, scheduleTime, scheduleTimezone, scheduleWeekday, scheduleMonthDay]);

  function handleCustomCronChange(val: string) {
    setCustomCron(val);
    if (val.trim()) {
      const v = validateCronExpression(val);
      setCronValidationError(v.valid ? null : (v.error ?? "Invalid expression"));
    } else {
      setCronValidationError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Routine name is required."); return; }
    if (scheduleEnabled && scheduleFrequency === "custom") {
      const v = validateCronExpression(customCron);
      if (!v.valid) { setError(`Invalid cron expression: ${v.error}`); return; }
    }

    setSaving(true);
    setError(null);
    setCfWarning(null);

    try {
      const triggerPhrases = triggerPhrasesText.split("\n").map((s) => s.trim()).filter(Boolean);
      const { id } = await onSave({
        name: name.trim(), description, triggerPhrases, instructions, dataSources, outputFormat, active,
        scheduleEnabled, scheduleFrequency, scheduleTime, scheduleWeekday, scheduleMonthDay,
        scheduleTimezone, scheduleCron: computedCron, lastScheduleUpdatedAt: null,
      });

      const { cfUpdated, cfError } = await onScheduleSave(id, {
        scheduleEnabled,
        scheduleFrequency,
        scheduleTime,
        scheduleWeekday,
        scheduleMonthDay,
        scheduleTimezone,
        scheduleCron: computedCron,
      });

      if (!cfUpdated && cfError) {
        setCfWarning(cfError);
        return; // stay open so user can see warning
      }

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
          {cfWarning && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="font-medium mb-1">Routine saved — schedule trigger warning</p>
              <p className="text-xs text-amber-800 mt-1">
                Your routine settings (output format, instructions, etc.) were saved successfully and will be used on the next run.
              </p>
              <p className="text-xs text-amber-700 mt-2">
                The Cloudflare cron trigger could not be updated automatically: {cfWarning}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 text-xs font-medium underline text-amber-700 hover:text-amber-900"
              >
                Close
              </button>
            </div>
          )}

          {/* General settings */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Routine Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Action Summary"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Data Sources</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Instructions / Logic</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder="Describe what Linda should do when this routine runs…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Output Format</label>
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

          {/* ── Schedule Settings ── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Schedule Settings</p>
                  <p className="text-xs text-slate-400">Configure automatic scheduled runs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  scheduleEnabled ? "bg-indigo-600" : "bg-slate-300"
                }`}
                aria-label={scheduleEnabled ? "Disable schedule" : "Enable schedule"}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    scheduleEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {scheduleEnabled && (
              <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
                    <select
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value as ScheduleFrequency)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom (cron)</option>
                    </select>
                  </div>

                  {scheduleFrequency !== "custom" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {scheduleFrequency === "weekly" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Day of Week</label>
                    <select
                      value={scheduleWeekday}
                      onChange={(e) => setScheduleWeekday(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      {WEEKDAYS.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {scheduleFrequency === "monthly" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={scheduleMonthDay}
                      onChange={(e) => setScheduleMonthDay(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}

                {scheduleFrequency === "custom" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Cron Expression
                      <span className="ml-1 font-normal text-slate-400">(UTC, 5 fields: min hr day month weekday)</span>
                    </label>
                    <input
                      type="text"
                      value={customCron}
                      onChange={(e) => handleCustomCronChange(e.target.value)}
                      placeholder="0 12 * * *"
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        cronValidationError ? "border-red-400 bg-red-50" : "border-slate-300"
                      }`}
                    />
                    {cronValidationError && (
                      <p className="mt-1 text-xs text-red-600">{cronValidationError}</p>
                    )}
                  </div>
                )}

                {scheduleFrequency !== "custom" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Timezone</label>
                    <select
                      value={scheduleTimezone}
                      onChange={(e) => setScheduleTimezone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Preview */}
                {computedCron && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                        {computedCron}
                      </span>
                      <span className="text-xs text-slate-400">UTC cron</span>
                    </div>
                    <p className="text-xs text-indigo-700">{cronDescription}</p>
                    {nextRunDate && (
                      <p className="text-xs text-slate-500">
                        Next run: <span className="font-medium">{formatNextRun(nextRunDate)}</span>
                      </p>
                    )}
                  </div>
                )}

                {scheduleEnabled && !computedCron && (
                  <p className="text-xs text-amber-600">
                    {scheduleFrequency === "custom"
                      ? "Enter a valid cron expression above."
                      : "Select a time and timezone to generate the schedule."}
                  </p>
                )}
              </div>
            )}
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
