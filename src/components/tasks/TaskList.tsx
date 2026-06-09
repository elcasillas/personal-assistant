"use client";

import { useEffect, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Task, TaskStatus, Priority } from "@/lib/types";
import TaskForm from "./TaskForm";

const statusGroups: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const priorityBadge: Record<Priority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const statusBadge: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  "in-progress": "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function fetchTasks() {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    fetchTasks();
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingTask(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">{tasks.length} total tasks</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">✓</div>
          <p className="text-slate-500 font-medium">No tasks yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first task to get started</p>
        </div>
      ) : (
        <div className="space-y-8">
          {statusGroups.map(({ id: statusId, label }) => {
            const groupTasks = tasks.filter((t) => t.status === statusId);
            if (groupTasks.length === 0) return null;
            return (
              <div key={statusId}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadge[statusId]}`}>
                    {label}
                  </span>
                  <span className="text-xs text-slate-400">{groupTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {groupTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white ring-1 ring-slate-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleEdit(task)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-slate-900 text-sm ${task.status === "done" ? "line-through text-slate-400" : ""}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[task.priority]}`}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-xs text-slate-400">
                              {format(new Date(task.dueDate), "MMM d")}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                            className="text-slate-300 hover:text-red-500 transition-colors text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <TaskForm
          task={editingTask}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); fetchTasks(); }}
        />
      )}
    </div>
  );
}
