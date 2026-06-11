import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { generateInitials, getAvatarColor } from "@/lib/todo-utils";
import type {
  Task,
  Group,
  FilterState,
  SortState,
  HiddenColumns,
  TaskPriority,
  SortField,
  TaskUpdate,
} from "@/lib/todo-types";

// ─── Current user (set by TodoModule on mount) ────────────────

export interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  color: string;
}

// ─── API helpers ──────────────────────────────────────────────

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

// ─── Seed helpers ─────────────────────────────────────────────

function makeOwner(name: string) {
  return { name, initials: generateInitials(name), color: getAvatarColor(name) };
}

function makeSeedData(now: string): { groups: Group[]; tasks: Task[] } {
  const groups: Group[] = [
    { id: "group-todo", name: "To-Do", color: "#3b82f6", collapsed: false, order: 0 },
    { id: "group-completed", name: "Completed", color: "#22c55e", collapsed: false, order: 1 },
  ];
  const tasks: Task[] = [
    {
      id: uuidv4(), title: "Review project proposal",
      owner: makeOwner("Alex Morgan"), status: "not_started",
      dueDate: null, priority: "urgent", notes: "Due before end of sprint",
      completed: false, groupId: "group-todo", createdAt: now, updatedAt: now, order: 0,
    },
    {
      id: uuidv4(), title: "Update documentation",
      owner: null, status: "done",
      dueDate: null, priority: "low", notes: "",
      completed: true, groupId: "group-completed", createdAt: now, updatedAt: now, order: 0,
    },
  ];
  return { groups, tasks };
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

// ─── Store interface ──────────────────────────────────────────

interface TodoStore {
  tasks: Task[];
  groups: Group[];
  filter: FilterState;
  sort: SortState;
  hiddenColumns: HiddenColumns;
  showDoneTasks: boolean;
  loading: boolean;
  error: string | null;
  groupReorderError: string | null;

  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;

  selectedTaskId: string | null;
  updates: Record<string, TaskUpdate[]>;
  updatesLoading: boolean;
  updateCounts: Record<string, number>;

  loadData: () => Promise<void>;

  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "order">) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  reorderTasks: (groupId: string, activeId: string, overId: string) => void;
  moveBetweenGroups: (taskId: string, toGroupId: string, overId?: string) => void;

  addGroup: (name: string) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  toggleGroup: (id: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  reorderGroups: (activeId: string, overId: string) => Promise<void>;
  clearGroupReorderError: () => void;

  setFilter: (filter: Partial<FilterState>) => void;
  clearFilters: () => void;
  setSort: (field: SortField) => void;
  toggleColumn: (col: keyof HiddenColumns) => void;
  toggleShowDoneTasks: () => void;

  selectTask: (id: string | null) => void;
  loadTaskUpdates: (taskId: string) => Promise<void>;
  addTaskUpdate: (taskId: string, content: string) => void;
  editTaskUpdate: (updateId: string, taskId: string, content: string) => void;
  deleteTaskUpdate: (updateId: string, taskId: string) => Promise<string | null>;
}

// ─── Persistence helpers ──────────────────────────────────────

function readShowDoneTasks(): boolean {
  try {
    const v = localStorage.getItem("todo_showDoneTasks");
    return v !== null ? v === "true" : false;
  } catch {
    return true;
  }
}

// ─── Store ────────────────────────────────────────────────────

export const useTodoStore = create<TodoStore>()((set, get) => ({
  tasks: [],
  groups: [],
  filter: { search: "", owner: "", status: "", priority: "" },
  sort: { field: "", direction: "asc" },
  hiddenColumns: { owner: false, status: false, dueDate: false, priority: false, notes: false },
  showDoneTasks: false,
  loading: true,
  error: null,
  groupReorderError: null,
  currentUser: null,
  selectedTaskId: null,
  updates: {},
  updatesLoading: false,
  updateCounts: {},

  setCurrentUser: (user) => {
    set({ currentUser: user });
    // Initialise showDoneTasks from localStorage now that we're on the client
    try {
      const v = localStorage.getItem("todo_showDoneTasks");
      if (v !== null) set({ showDoneTasks: v === "true" });
    } catch { /* ignore */ }
  },

  // ── Bootstrap ──────────────────────────────────────────────
  loadData: async () => {
    const hasData = get().groups.length > 0;
    if (!hasData) set({ loading: true, error: null });

    try {
      const [groups, tasks, updateCounts] = await Promise.all([
        fetch("/api/todo/groups").then((r) => r.json()),
        fetch("/api/todo/tasks").then((r) => r.json()),
        fetch("/api/todo/update-counts").then((r) => r.json()),
      ]);

      if (groups.length === 0 && !hasData) {
        const now = new Date().toISOString();
        const seed = makeSeedData(now);
        await Promise.all([
          ...seed.groups.map((g) => api("/api/todo/groups", "POST", g)),
          ...seed.tasks.map((t) => api("/api/todo/tasks", "POST", t)),
        ]);
        set({ groups: seed.groups, tasks: seed.tasks, updateCounts: {} });
      } else {
        set({ groups: groups.map((g: Group) => ({ ...g, collapsed: false })), tasks, updateCounts: updateCounts ?? {} });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!hasData) set({ error: msg });
    } finally {
      set({ loading: false });
    }
  },

  // ── Task actions ───────────────────────────────────────────
  addTask: (taskData) => {
    const { tasks } = get();
    const groupTasks = tasks.filter((t) => t.groupId === taskData.groupId);
    const id = uuidv4();
    const now = new Date().toISOString();
    const task: Task = { ...taskData, id, createdAt: now, updatedAt: now, order: groupTasks.length };
    set({ tasks: [...tasks, task] });
    api("/api/todo/tasks", "POST", task).catch(console.error);
    return id;
  },

  updateTask: (id, updates) => {
    const now = new Date().toISOString();
    set({ tasks: get().tasks.map((t) => t.id === id ? { ...t, ...updates, updatedAt: now } : t) });
    api("/api/todo/tasks", "PATCH", { id, ...updates }).catch(console.error);
  },

  deleteTask: (id) => {
    set((state) => {
      const updates = { ...state.updates };
      delete updates[id];
      const updateCounts = { ...state.updateCounts };
      delete updateCounts[id];
      return {
        tasks: state.tasks.filter((t) => t.id !== id),
        selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        updates,
        updateCounts,
      };
    });
    api("/api/todo/tasks", "DELETE", { id }).catch(console.error);
  },

  duplicateTask: (id) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const groupTasks = tasks.filter((t) => t.groupId === task.groupId);
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task, id: uuidv4(), title: `${task.title} (copy)`,
      createdAt: now, updatedAt: now, order: groupTasks.length,
    };
    set({ tasks: [...tasks, newTask] });
    api("/api/todo/tasks", "POST", newTask).catch(console.error);
  },

  reorderTasks: (groupId, activeId, overId) => {
    const { tasks } = get();
    const groupTasks = tasks.filter((t) => t.groupId === groupId).sort((a, b) => a.order - b.order);
    const activeIdx = groupTasks.findIndex((t) => t.id === activeId);
    const overIdx = groupTasks.findIndex((t) => t.id === overId);
    if (activeIdx === -1 || overIdx === -1) return;

    const reordered = [...groupTasks];
    const [moved] = reordered.splice(activeIdx, 1);
    reordered.splice(overIdx, 0, moved);

    const orderMap = Object.fromEntries(reordered.map((t, i) => [t.id, i]));
    const updated = tasks.map((t) => orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t);
    set({ tasks: updated });

    const items = reordered.map((t, i) => ({ id: t.id, order: i }));
    api("/api/todo/reorder/tasks", "POST", { items }).catch(console.error);
  },

  moveBetweenGroups: (taskId, toGroupId, overId) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.groupId === toGroupId) return;

    const toGroupTasks = tasks.filter((t) => t.groupId === toGroupId).sort((a, b) => a.order - b.order);
    let insertAt = toGroupTasks.length;
    if (overId) {
      const overIdx = toGroupTasks.findIndex((t) => t.id === overId);
      if (overIdx !== -1) insertAt = overIdx;
    }

    const now = new Date().toISOString();
    const updated = tasks.map((t) => {
      if (t.id === taskId) return { ...t, groupId: toGroupId, order: insertAt, updatedAt: now };
      if (t.groupId === toGroupId) {
        const idx = toGroupTasks.findIndex((tt) => tt.id === t.id);
        return { ...t, order: idx >= insertAt ? idx + 1 : idx };
      }
      return t;
    });
    set({ tasks: updated });

    api("/api/todo/tasks", "PATCH", { id: taskId, groupId: toGroupId, order: insertAt }).catch(console.error);
    const affectedItems = toGroupTasks.map((t, i) => ({ id: t.id, order: i >= insertAt ? i + 1 : i }));
    if (affectedItems.length > 0) {
      api("/api/todo/reorder/tasks", "POST", { items: affectedItems }).catch(console.error);
    }
  },

  // ── Group actions ──────────────────────────────────────────
  addGroup: (name) => {
    const { groups } = get();
    const palette = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4"];
    const newGroup: Group = {
      id: uuidv4(), name,
      color: palette[groups.length % palette.length],
      collapsed: false, order: groups.length,
    };
    set({ groups: [...groups, newGroup] });
    api("/api/todo/groups", "POST", newGroup).catch(console.error);
  },

  updateGroup: (id, updates) => {
    set({ groups: get().groups.map((g) => (g.id === id ? { ...g, ...updates } : g)) });
    api("/api/todo/groups", "PATCH", { id, ...updates }).catch(console.error);
  },

  deleteGroup: (id) => {
    set({
      groups: get().groups.filter((g) => g.id !== id),
      tasks: get().tasks.filter((t) => t.groupId !== id),
    });
    api("/api/todo/groups", "DELETE", { id }).catch(console.error);
  },

  toggleGroup: (id) => {
    const group = get().groups.find((g) => g.id === id);
    if (!group) return;
    const collapsed = !group.collapsed;
    set({ groups: get().groups.map((g) => (g.id === id ? { ...g, collapsed } : g)) });
    api("/api/todo/groups", "PATCH", { id, collapsed }).catch(console.error);
  },

  collapseAll: () => set({ groups: get().groups.map((g) => ({ ...g, collapsed: true })) }),
  expandAll: () => set({ groups: get().groups.map((g) => ({ ...g, collapsed: false })) }),

  reorderGroups: async (activeId, overId) => {
    const { groups } = get();
    const sorted = [...groups].sort((a, b) => a.order - b.order);
    const activeIdx = sorted.findIndex((g) => g.id === activeId);
    const overIdx = sorted.findIndex((g) => g.id === overId);
    if (activeIdx === -1 || overIdx === -1) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(activeIdx, 1);
    reordered.splice(overIdx, 0, moved);
    const newGroups = reordered.map((g, i) => ({ ...g, order: i }));

    set({ groups: newGroups, groupReorderError: null });

    try {
      await api("/api/todo/reorder/groups", "POST", {
        items: newGroups.map((g) => ({ id: g.id, order: g.order })),
      });
    } catch (err) {
      set({ groups, groupReorderError: err instanceof Error ? err.message : "Failed to save group order." });
    }
  },

  clearGroupReorderError: () => set({ groupReorderError: null }),

  // ── Filter / sort ──────────────────────────────────────────
  setFilter: (filter) => set({ filter: { ...get().filter, ...filter } }),
  clearFilters: () => set({ filter: { search: "", owner: "", status: "", priority: "" } }),

  setSort: (field) => {
    const { sort } = get();
    if (sort.field === field) {
      set({ sort: sort.direction === "asc" ? { field, direction: "desc" } : { field: "", direction: "asc" } });
    } else {
      set({ sort: { field, direction: "asc" } });
    }
  },

  toggleColumn: (col) => {
    set({ hiddenColumns: { ...get().hiddenColumns, [col]: !get().hiddenColumns[col] } });
  },

  toggleShowDoneTasks: () => {
    const next = !get().showDoneTasks;
    try { localStorage.setItem("todo_showDoneTasks", String(next)); } catch { /* ignore */ }
    set({ showDoneTasks: next });
  },

  // ── Side panel ─────────────────────────────────────────────
  selectTask: (id) => {
    set({ selectedTaskId: id });
    if (id !== null && !(id in get().updates)) get().loadTaskUpdates(id);
  },

  loadTaskUpdates: async (taskId) => {
    set({ updatesLoading: true });
    try {
      const fetched = await fetch(`/api/todo/task-updates?taskId=${taskId}`).then((r) => r.json());
      set((state) => ({
        updates: { ...state.updates, [taskId]: fetched },
        updatesLoading: false,
        updateCounts: { ...state.updateCounts, [taskId]: fetched.length },
      }));
    } catch (err) {
      console.error("[loadTaskUpdates]", err);
      set({ updatesLoading: false });
    }
  },

  addTaskUpdate: (taskId, content) => {
    const { currentUser } = get();
    const authorName = currentUser?.name ?? "Unknown";
    const update: TaskUpdate = {
      id: uuidv4(),
      taskId,
      authorName,
      authorInitials: currentUser?.initials ?? generateInitials(authorName),
      authorColor: currentUser?.color ?? getAvatarColor(authorName),
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      updates: { ...state.updates, [taskId]: [update, ...(state.updates[taskId] ?? [])] },
      updateCounts: { ...state.updateCounts, [taskId]: (state.updateCounts[taskId] ?? 0) + 1 },
    }));
    api("/api/todo/task-updates", "POST", update).catch(console.error);
  },

  editTaskUpdate: (updateId, taskId, content) => {
    const now = new Date().toISOString();
    set((state) => ({
      updates: {
        ...state.updates,
        [taskId]: (state.updates[taskId] ?? []).map((u) =>
          u.id === updateId ? { ...u, content, updatedAt: now } : u
        ),
      },
    }));
    api("/api/todo/task-updates", "PATCH", { id: updateId, content }).catch(console.error);
  },

  deleteTaskUpdate: async (updateId, taskId) => {
    try {
      await api("/api/todo/task-updates", "DELETE", { id: updateId });
      set((state) => ({
        updates: {
          ...state.updates,
          [taskId]: (state.updates[taskId] ?? []).filter((u) => u.id !== updateId),
        },
        updateCounts: {
          ...state.updateCounts,
          [taskId]: Math.max(0, (state.updateCounts[taskId] ?? 1) - 1),
        },
      }));
      return null;
    } catch (err) {
      console.error("[deleteTaskUpdate]", err);
      return err instanceof Error ? err.message : "Failed to delete update.";
    }
  },
}));

// ─── Selector helper ──────────────────────────────────────────

export function getFilteredGroupTasks(
  tasks: Task[],
  groupId: string,
  filter: FilterState,
  sort: SortState,
  showDoneTasks = true
): Task[] {
  let filtered = tasks.filter((t) => t.groupId === groupId);
  if (!showDoneTasks) filtered = filtered.filter((t) => t.status !== "done");

  const { search, owner, status, priority } = filter;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.owner?.name.toLowerCase().includes(q)
    );
  }
  if (owner) filtered = filtered.filter((t) => t.owner?.name.toLowerCase().includes(owner.toLowerCase()));
  if (status) filtered = filtered.filter((t) => t.status === status);
  if (priority) filtered = filtered.filter((t) => t.priority === priority);

  const { field, direction } = sort;
  if (field) {
    filtered = [...filtered].sort((a, b) => {
      let av = "", bv = "";
      if (field === "title") { av = a.title; bv = b.title; }
      else if (field === "status") { av = a.status; bv = b.status; }
      else if (field === "priority") { av = String(PRIORITY_ORDER[a.priority]); bv = String(PRIORITY_ORDER[b.priority]); }
      else if (field === "dueDate") { av = a.dueDate || ""; bv = b.dueDate || ""; }
      else if (field === "owner") { av = a.owner?.name || ""; bv = b.owner?.name || ""; }
      const cmp = av.localeCompare(bv);
      return direction === "asc" ? cmp : -cmp;
    });
  } else {
    filtered = [...filtered].sort((a, b) => a.order - b.order);
  }

  return filtered;
}
