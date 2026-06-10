"use client";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { TaskTable } from "./TaskTable";
import { TaskModal } from "./TaskModal";
import { TaskSidePanel } from "./TaskSidePanel";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useTodoStore } from "@/store/useTodoStore";
import { useUser } from "@/hooks/useUser";
import { generateInitials, getAvatarColor } from "@/lib/todo-utils";
import type { Task } from "@/lib/todo-types";

export default function TodoModule() {
  const { loadData, loading, error, deleteTask, tasks, selectedTaskId, updates, updatesLoading, selectTask, setCurrentUser } = useTodoStore();
  const { user } = useUser();

  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;

  const [modalState, setModalState] = useState<{ open: boolean; task?: Task | null; defaultGroupId?: string }>({ open: false });
  const [deleteState, setDeleteState] = useState<{ open: boolean; taskId?: string }>({ open: false });

  // Sync logged-in user into store so updates can be attributed correctly
  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.name,
        initials: generateInitials(user.name),
        color: getAvatarColor(user.name),
      });
    }
  }, [user, setCurrentUser]);

  useEffect(() => { loadData(); }, []);

  const openAddTask = (groupId?: string) => setModalState({ open: true, task: null, defaultGroupId: groupId });
  const openEditTask = (task: Task) => setModalState({ open: true, task });
  const openDeleteTask = (taskId: string) => setDeleteState({ open: true, taskId });
  const closeModal = () => setModalState((s) => ({ ...s, open: false }));
  const closeDelete = () => setDeleteState({ open: false });
  const handleConfirmDelete = () => { if (deleteState.taskId) deleteTask(deleteState.taskId); closeDelete(); };

  return (
    <>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="py-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-500">Loading your tasks…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800 mb-2">Could not load tasks</p>
                  <pre className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 max-w-sm text-left whitespace-pre-wrap break-words">{error}</pre>
                  <button onClick={() => loadData()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mx-auto">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Toolbar onAddTask={openAddTask} />
                <TaskTable onEditTask={openEditTask} onDeleteTask={openDeleteTask} onAddTask={openAddTask} />
              </>
            )}
          </div>
        </main>

        {selectedTask && (
          <aside className="fixed inset-0 z-40 bg-white flex flex-col sm:relative sm:inset-auto sm:z-auto sm:w-[460px] sm:flex-shrink-0 sm:border-l sm:border-slate-200 sm:overflow-y-auto">
            <TaskSidePanel task={selectedTask} updates={updates[selectedTask.id] ?? []} updatesLoading={updatesLoading} onClose={() => selectTask(null)} />
          </aside>
        )}
      </div>

      {modalState.open && (
        <TaskModal task={modalState.task} defaultGroupId={modalState.defaultGroupId} onClose={closeModal} />
      )}

      {deleteState.open && (
        <ConfirmDialog
          title="Delete task"
          message="This action cannot be undone. The task will be permanently removed."
          confirmLabel="Delete task"
          onConfirm={handleConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </>
  );
}
