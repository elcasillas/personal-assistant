import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { generateInitials, getAvatarColor } from "@/lib/todo-utils";
import type {
  FollowUpItem,
  FollowUpGroup,
  FollowUpFilterState,
  FollowUpSortState,
  FollowUpHiddenColumns,
  FollowUpPriority,
  FollowUpSortField,
  FollowUpUpdate,
} from "@/lib/followup-types";

// ─── Current user ─────────────────────────────────────────────

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

function makeSeedData(now: string): { groups: FollowUpGroup[]; items: FollowUpItem[] } {
  const groups: FollowUpGroup[] = [
    { id: "fg-pending", name: "Pending", color: "#6366f1", collapsed: false, order: 0 },
    { id: "fg-done", name: "Completed", color: "#22c55e", collapsed: false, order: 1 },
  ];
  const items: FollowUpItem[] = [
    {
      id: uuidv4(), subject: "Send project update", contactName: "Alex Morgan",
      status: "not_started", priority: "high", dueDate: null, notes: "",
      completed: false, groupId: "fg-pending", order: 0, createdAt: now, updatedAt: now,
    },
  ];
  return { groups, items };
}

const PRIORITY_ORDER: Record<FollowUpPriority, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

// ─── Store interface ──────────────────────────────────────────

interface FollowUpStore {
  items: FollowUpItem[];
  groups: FollowUpGroup[];
  filter: FollowUpFilterState;
  sort: FollowUpSortState;
  hiddenColumns: FollowUpHiddenColumns;
  showDoneItems: boolean;
  loading: boolean;
  error: string | null;
  groupReorderError: string | null;

  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;

  selectedItemId: string | null;
  updates: Record<string, FollowUpUpdate[]>;
  updatesLoading: boolean;
  updateCounts: Record<string, number>;

  loadData: () => Promise<void>;

  addItem: (item: Omit<FollowUpItem, "id" | "createdAt" | "updatedAt" | "order">) => string;
  updateItem: (id: string, updates: Partial<FollowUpItem>) => void;
  deleteItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  reorderItems: (groupId: string, activeId: string, overId: string) => void;
  moveBetweenGroups: (itemId: string, toGroupId: string, overId?: string) => void;

  addGroup: (name: string) => void;
  updateGroup: (id: string, updates: Partial<FollowUpGroup>) => void;
  deleteGroup: (id: string) => void;
  toggleGroup: (id: string) => void;
  reorderGroups: (activeId: string, overId: string) => Promise<void>;
  clearGroupReorderError: () => void;

  setFilter: (filter: Partial<FollowUpFilterState>) => void;
  clearFilters: () => void;
  setSort: (field: FollowUpSortField) => void;
  toggleColumn: (col: keyof FollowUpHiddenColumns) => void;
  toggleShowDoneItems: () => void;

  selectItem: (id: string | null) => void;
  loadItemUpdates: (followupId: string) => Promise<void>;
  addItemUpdate: (followupId: string, content: string) => void;
  editItemUpdate: (updateId: string, followupId: string, content: string) => void;
  deleteItemUpdate: (updateId: string, followupId: string) => Promise<string | null>;
}

// ─── Store ────────────────────────────────────────────────────

export const useFollowUpStore = create<FollowUpStore>()((set, get) => ({
  items: [],
  groups: [],
  filter: { search: "", contact: "", status: "", priority: "" },
  sort: { field: "", direction: "asc" },
  hiddenColumns: { contactName: false, status: false, dueDate: false, priority: false, notes: false },
  showDoneItems: true,
  loading: true,
  error: null,
  groupReorderError: null,
  currentUser: null,
  selectedItemId: null,
  updates: {},
  updatesLoading: false,
  updateCounts: {},

  setCurrentUser: (user) => {
    set({ currentUser: user });
    try {
      const v = localStorage.getItem("followup_showDoneItems");
      if (v !== null) set({ showDoneItems: v === "true" });
    } catch { /* ignore */ }
  },

  // ── Bootstrap ──────────────────────────────────────────────
  loadData: async () => {
    const hasData = get().groups.length > 0;
    if (!hasData) set({ loading: true, error: null });

    try {
      const [groups, items, updateCounts] = await Promise.all([
        fetch("/api/followup/groups").then((r) => r.json()),
        fetch("/api/followup/items").then((r) => r.json()),
        fetch("/api/followup/update-counts").then((r) => r.json()),
      ]);

      if (groups.length === 0 && !hasData) {
        // Try to auto-migrate old followups data first
        try {
          const migrated = await api("/api/followup/migrate", "POST");
          if (migrated.migrated > 0) {
            const [newGroups, newItems] = await Promise.all([
              fetch("/api/followup/groups").then((r) => r.json()),
              fetch("/api/followup/items").then((r) => r.json()),
            ]);
            set({ groups: newGroups, items: newItems, updateCounts: {} });
            return;
          }
        } catch { /* ignore migration errors, fall through to seed */ }

        const now = new Date().toISOString();
        const seed = makeSeedData(now);
        await Promise.all([
          ...seed.groups.map((g) => api("/api/followup/groups", "POST", g)),
          ...seed.items.map((t) => api("/api/followup/items", "POST", t)),
        ]);
        set({ groups: seed.groups, items: seed.items, updateCounts: {} });
      } else {
        set({ groups, items, updateCounts: updateCounts ?? {} });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!hasData) set({ error: msg });
    } finally {
      set({ loading: false });
    }
  },

  // ── Item actions ───────────────────────────────────────────
  addItem: (itemData) => {
    const { items } = get();
    const groupItems = items.filter((t) => t.groupId === itemData.groupId);
    const id = uuidv4();
    const now = new Date().toISOString();
    const item: FollowUpItem = { ...itemData, id, createdAt: now, updatedAt: now, order: groupItems.length };
    set({ items: [...items, item] });
    api("/api/followup/items", "POST", item).catch(console.error);
    return id;
  },

  updateItem: (id, updates) => {
    const now = new Date().toISOString();
    set({ items: get().items.map((t) => t.id === id ? { ...t, ...updates, updatedAt: now } : t) });
    api("/api/followup/items", "PATCH", { id, ...updates }).catch(console.error);
  },

  deleteItem: (id) => {
    set((state) => {
      const updates = { ...state.updates };
      delete updates[id];
      const updateCounts = { ...state.updateCounts };
      delete updateCounts[id];
      return {
        items: state.items.filter((t) => t.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        updates,
        updateCounts,
      };
    });
    api("/api/followup/items", "DELETE", { id }).catch(console.error);
  },

  duplicateItem: (id) => {
    const { items } = get();
    const item = items.find((t) => t.id === id);
    if (!item) return;
    const groupItems = items.filter((t) => t.groupId === item.groupId);
    const now = new Date().toISOString();
    const newItem: FollowUpItem = {
      ...item, id: uuidv4(), subject: `${item.subject} (copy)`,
      createdAt: now, updatedAt: now, order: groupItems.length,
    };
    set({ items: [...items, newItem] });
    api("/api/followup/items", "POST", newItem).catch(console.error);
  },

  reorderItems: (groupId, activeId, overId) => {
    const { items } = get();
    const groupItems = items.filter((t) => t.groupId === groupId).sort((a, b) => a.order - b.order);
    const activeIdx = groupItems.findIndex((t) => t.id === activeId);
    const overIdx = groupItems.findIndex((t) => t.id === overId);
    if (activeIdx === -1 || overIdx === -1) return;

    const reordered = [...groupItems];
    const [moved] = reordered.splice(activeIdx, 1);
    reordered.splice(overIdx, 0, moved);

    const orderMap = Object.fromEntries(reordered.map((t, i) => [t.id, i]));
    const updated = items.map((t) => orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t);
    set({ items: updated });

    api("/api/followup/reorder/items", "POST", { items: reordered.map((t, i) => ({ id: t.id, order: i })) }).catch(console.error);
  },

  moveBetweenGroups: (itemId, toGroupId, overId) => {
    const { items } = get();
    const item = items.find((t) => t.id === itemId);
    if (!item || item.groupId === toGroupId) return;

    const toGroupItems = items.filter((t) => t.groupId === toGroupId).sort((a, b) => a.order - b.order);
    let insertAt = toGroupItems.length;
    if (overId) {
      const overIdx = toGroupItems.findIndex((t) => t.id === overId);
      if (overIdx !== -1) insertAt = overIdx;
    }

    const now = new Date().toISOString();
    const updated = items.map((t) => {
      if (t.id === itemId) return { ...t, groupId: toGroupId, order: insertAt, updatedAt: now };
      if (t.groupId === toGroupId) {
        const idx = toGroupItems.findIndex((tt) => tt.id === t.id);
        return { ...t, order: idx >= insertAt ? idx + 1 : idx };
      }
      return t;
    });
    set({ items: updated });

    api("/api/followup/items", "PATCH", { id: itemId, groupId: toGroupId, order: insertAt }).catch(console.error);
    const affectedItems = toGroupItems.map((t, i) => ({ id: t.id, order: i >= insertAt ? i + 1 : i }));
    if (affectedItems.length > 0) {
      api("/api/followup/reorder/items", "POST", { items: affectedItems }).catch(console.error);
    }
  },

  // ── Group actions ──────────────────────────────────────────
  addGroup: (name) => {
    const { groups } = get();
    const palette = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4", "#3b82f6", "#22c55e"];
    const newGroup: FollowUpGroup = {
      id: uuidv4(), name,
      color: palette[groups.length % palette.length],
      collapsed: false, order: groups.length,
    };
    set({ groups: [...groups, newGroup] });
    api("/api/followup/groups", "POST", newGroup).catch(console.error);
  },

  updateGroup: (id, updates) => {
    set({ groups: get().groups.map((g) => (g.id === id ? { ...g, ...updates } : g)) });
    api("/api/followup/groups", "PATCH", { id, ...updates }).catch(console.error);
  },

  deleteGroup: (id) => {
    set({
      groups: get().groups.filter((g) => g.id !== id),
      items: get().items.filter((t) => t.groupId !== id),
    });
    api("/api/followup/groups", "DELETE", { id }).catch(console.error);
  },

  toggleGroup: (id) => {
    const group = get().groups.find((g) => g.id === id);
    if (!group) return;
    const collapsed = !group.collapsed;
    set({ groups: get().groups.map((g) => (g.id === id ? { ...g, collapsed } : g)) });
    api("/api/followup/groups", "PATCH", { id, collapsed }).catch(console.error);
  },

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
      await api("/api/followup/reorder/groups", "POST", {
        items: newGroups.map((g) => ({ id: g.id, order: g.order })),
      });
    } catch (err) {
      set({ groups, groupReorderError: err instanceof Error ? err.message : "Failed to save group order." });
    }
  },

  clearGroupReorderError: () => set({ groupReorderError: null }),

  // ── Filter / sort ──────────────────────────────────────────
  setFilter: (filter) => set({ filter: { ...get().filter, ...filter } }),
  clearFilters: () => set({ filter: { search: "", contact: "", status: "", priority: "" } }),

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

  toggleShowDoneItems: () => {
    const next = !get().showDoneItems;
    try { localStorage.setItem("followup_showDoneItems", String(next)); } catch { /* ignore */ }
    set({ showDoneItems: next });
  },

  // ── Side panel ─────────────────────────────────────────────
  selectItem: (id) => {
    set({ selectedItemId: id });
    if (id !== null && !(id in get().updates)) get().loadItemUpdates(id);
  },

  loadItemUpdates: async (followupId) => {
    set({ updatesLoading: true });
    try {
      const fetched = await fetch(`/api/followup/updates?followupId=${followupId}`).then((r) => r.json());
      set((state) => ({
        updates: { ...state.updates, [followupId]: fetched },
        updatesLoading: false,
        updateCounts: { ...state.updateCounts, [followupId]: fetched.length },
      }));
    } catch (err) {
      console.error("[loadItemUpdates]", err);
      set({ updatesLoading: false });
    }
  },

  addItemUpdate: (followupId, content) => {
    const { currentUser } = get();
    const authorName = currentUser?.name ?? "Unknown";
    const update: FollowUpUpdate = {
      id: uuidv4(),
      followupId,
      authorName,
      authorInitials: currentUser?.initials ?? generateInitials(authorName),
      authorColor: currentUser?.color ?? getAvatarColor(authorName),
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      updates: { ...state.updates, [followupId]: [update, ...(state.updates[followupId] ?? [])] },
      updateCounts: { ...state.updateCounts, [followupId]: (state.updateCounts[followupId] ?? 0) + 1 },
    }));
    api("/api/followup/updates", "POST", update).catch(console.error);
  },

  editItemUpdate: (updateId, followupId, content) => {
    const now = new Date().toISOString();
    set((state) => ({
      updates: {
        ...state.updates,
        [followupId]: (state.updates[followupId] ?? []).map((u) =>
          u.id === updateId ? { ...u, content, updatedAt: now } : u
        ),
      },
    }));
    api("/api/followup/updates", "PATCH", { id: updateId, content }).catch(console.error);
  },

  deleteItemUpdate: async (updateId, followupId) => {
    try {
      await api("/api/followup/updates", "DELETE", { id: updateId });
      set((state) => ({
        updates: {
          ...state.updates,
          [followupId]: (state.updates[followupId] ?? []).filter((u) => u.id !== updateId),
        },
        updateCounts: {
          ...state.updateCounts,
          [followupId]: Math.max(0, (state.updateCounts[followupId] ?? 1) - 1),
        },
      }));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Failed to delete update.";
    }
  },
}));

// ─── Selector helper ──────────────────────────────────────────

export function getFilteredGroupItems(
  items: FollowUpItem[],
  groupId: string,
  filter: FollowUpFilterState,
  sort: FollowUpSortState,
  showDoneItems = true
): FollowUpItem[] {
  let filtered = items.filter((t) => t.groupId === groupId);
  if (!showDoneItems) filtered = filtered.filter((t) => t.status !== "done");

  const { search, contact, status, priority } = filter;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.contactName.toLowerCase().includes(q)
    );
  }
  if (contact) filtered = filtered.filter((t) => t.contactName.toLowerCase().includes(contact.toLowerCase()));
  if (status) filtered = filtered.filter((t) => t.status === status);
  if (priority) filtered = filtered.filter((t) => t.priority === priority);

  const { field, direction } = sort;
  if (field) {
    filtered = [...filtered].sort((a, b) => {
      let av = "", bv = "";
      if (field === "subject") { av = a.subject; bv = b.subject; }
      else if (field === "status") { av = a.status; bv = b.status; }
      else if (field === "priority") { av = String(PRIORITY_ORDER[a.priority]); bv = String(PRIORITY_ORDER[b.priority]); }
      else if (field === "dueDate") { av = a.dueDate || ""; bv = b.dueDate || ""; }
      else if (field === "contactName") { av = a.contactName; bv = b.contactName; }
      const cmp = av.localeCompare(bv);
      return direction === "asc" ? cmp : -cmp;
    });
  } else {
    filtered = [...filtered].sort((a, b) => a.order - b.order);
  }

  return filtered;
}
