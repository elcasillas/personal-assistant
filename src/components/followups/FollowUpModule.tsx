"use client";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { FollowUpToolbar } from "./FollowUpToolbar";
import { FollowUpTable } from "./FollowUpTable";
import { FollowUpModal } from "./FollowUpModal";
import { FollowUpSidePanel } from "./FollowUpSidePanel";
import { ConfirmDialog } from "@/components/todo/ui/ConfirmDialog";
import { useFollowUpStore } from "@/store/useFollowUpStore";
import { useUser } from "@/hooks/useUser";
import { generateInitials, getAvatarColor } from "@/lib/todo-utils";
import type { FollowUpItem } from "@/lib/followup-types";

export default function FollowUpModule() {
  const { loadData, loading, error, deleteItem, items, selectedItemId, updates, updatesLoading, selectItem, setCurrentUser } = useFollowUpStore();
  const { user } = useUser();

  const selectedItem = selectedItemId ? (items.find((t) => t.id === selectedItemId) ?? null) : null;

  const [modalState, setModalState] = useState<{ open: boolean; item?: FollowUpItem | null; defaultGroupId?: string }>({ open: false });
  const [deleteState, setDeleteState] = useState<{ open: boolean; itemId?: string }>({ open: false });

  useEffect(() => {
    if (user) {
      setCurrentUser({ id: user.id, name: user.name, initials: generateInitials(user.name), color: getAvatarColor(user.name) });
    }
  }, [user, setCurrentUser]);

  useEffect(() => { loadData(); }, []);

  const openAddItem = (groupId?: string) => setModalState({ open: true, item: null, defaultGroupId: groupId });
  const openEditItem = (item: FollowUpItem) => setModalState({ open: true, item });
  const openDeleteItem = (itemId: string) => setDeleteState({ open: true, itemId });
  const closeModal = () => setModalState((s) => ({ ...s, open: false }));
  const closeDelete = () => setDeleteState({ open: false });
  const handleConfirmDelete = () => { if (deleteState.itemId) deleteItem(deleteState.itemId); closeDelete(); };

  return (
    <>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="py-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-500">Loading your follow-ups…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800 mb-2">Could not load follow-ups</p>
                  <pre className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 max-w-sm text-left whitespace-pre-wrap break-words">{error}</pre>
                  <button onClick={() => loadData()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors mx-auto">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <FollowUpToolbar onAddItem={openAddItem} />
                <FollowUpTable onEditItem={openEditItem} onDeleteItem={openDeleteItem} onAddItem={openAddItem} />
              </>
            )}
          </div>
        </main>

        {selectedItem && (
          <aside className="fixed inset-0 z-40 bg-white flex flex-col sm:relative sm:inset-auto sm:z-auto sm:w-[460px] sm:flex-shrink-0 sm:border-l sm:border-slate-200 sm:overflow-y-auto">
            <FollowUpSidePanel item={selectedItem} updates={updates[selectedItem.id] ?? []} updatesLoading={updatesLoading} onClose={() => selectItem(null)} />
          </aside>
        )}
      </div>

      {modalState.open && (
        <FollowUpModal item={modalState.item} defaultGroupId={modalState.defaultGroupId} onClose={closeModal} />
      )}

      {deleteState.open && (
        <ConfirmDialog
          title="Delete follow-up"
          message="This action cannot be undone. The follow-up will be permanently removed."
          confirmLabel="Delete follow-up"
          onConfirm={handleConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </>
  );
}
