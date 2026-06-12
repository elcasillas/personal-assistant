import { create } from "zustand";
import type { Routine, RoutineRun } from "@/lib/types";

export interface SchedulePayload {
  scheduleEnabled: boolean;
  scheduleFrequency: string | null;
  scheduleTime: string | null;
  scheduleWeekday: number | null;
  scheduleMonthDay: number | null;
  scheduleTimezone: string;
  scheduleCron: string | null;
}

interface RoutineStore {
  routines: Routine[];
  loading: boolean;
  error: string | null;
  // run history keyed by routineId
  runHistory: Record<string, RoutineRun[]>;
  runHistoryLoading: Record<string, boolean>;
  loadData: () => Promise<void>;
  createRoutine: (data: Omit<Routine, "id" | "userId" | "lastRunAt" | "createdAt" | "updatedAt">) => Promise<Routine>;
  updateRoutine: (id: string, data: Partial<Omit<Routine, "id" | "userId" | "createdAt" | "updatedAt">>) => Promise<void>;
  updateSchedule: (id: string, data: SchedulePayload) => Promise<{ cfUpdated: boolean; cfError: string | null }>;
  deleteRoutine: (id: string) => Promise<void>;
  updateLastRunAt: (id: string, lastRunAt: string) => void;
  loadRunHistory: (routineId: string) => Promise<void>;
  prependRun: (routineId: string, run: RoutineRun) => void;
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  routines: [],
  loading: false,
  error: null,
  runHistory: {},
  runHistoryLoading: {},

  async loadData() {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/routines");
      if (!res.ok) throw new Error("Failed to load routines");
      const data = await res.json() as Routine[];
      set({ routines: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  async createRoutine(data) {
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create routine");
    const created = await res.json() as Routine;
    set((s) => ({ routines: [...s.routines, created] }));
    return created;
  },

  async updateRoutine(id, data) {
    const res = await fetch(`/api/routines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update routine");
    const updated = await res.json() as Routine;
    set((s) => ({
      routines: s.routines.map((r) => (r.id === id ? updated : r)),
    }));
  },

  async updateSchedule(id, data) {
    const res = await fetch(`/api/routines/${id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(body.error ?? "Failed to update schedule");
    }
    const result = await res.json() as { cfUpdated: boolean; cfError: string | null };
    set((s) => ({
      routines: s.routines.map((r) =>
        r.id === id
          ? {
              ...r,
              ...data,
              scheduleFrequency: (data.scheduleFrequency as Routine["scheduleFrequency"]),
              lastScheduleUpdatedAt: new Date().toISOString(),
            }
          : r
      ),
    }));
    return result;
  },

  async deleteRoutine(id) {
    const res = await fetch(`/api/routines/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete routine");
    set((s) => {
      const { [id]: _, ...rest } = s.runHistory;
      return { routines: s.routines.filter((r) => r.id !== id), runHistory: rest };
    });
  },

  updateLastRunAt(id, lastRunAt) {
    set((s) => ({
      routines: s.routines.map((r) => (r.id === id ? { ...r, lastRunAt } : r)),
    }));
  },

  async loadRunHistory(routineId) {
    set((s) => ({ runHistoryLoading: { ...s.runHistoryLoading, [routineId]: true } }));
    try {
      const res = await fetch(`/api/routines/${routineId}/runs`);
      if (!res.ok) throw new Error("Failed to load run history");
      const runs = await res.json() as RoutineRun[];
      set((s) => ({
        runHistory: { ...s.runHistory, [routineId]: runs },
        runHistoryLoading: { ...s.runHistoryLoading, [routineId]: false },
      }));
    } catch {
      set((s) => ({ runHistoryLoading: { ...s.runHistoryLoading, [routineId]: false } }));
    }
  },

  prependRun(routineId, run) {
    set((s) => ({
      runHistory: {
        ...s.runHistory,
        [routineId]: [run, ...(s.runHistory[routineId] ?? [])],
      },
    }));
  },
}));
