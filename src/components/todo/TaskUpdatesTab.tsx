"use client";
import { TaskUpdateComposer } from "./TaskUpdateComposer";
import { TaskUpdateList } from "./TaskUpdateList";
import { useTodoStore } from "@/store/useTodoStore";
import type { Task, TaskUpdate } from "@/lib/todo-types";

interface TaskUpdatesTabProps {
  task: Task;
  updates: TaskUpdate[];
  loading: boolean;
}

export function TaskUpdatesTab({ task, updates, loading }: TaskUpdatesTabProps) {
  const { addTaskUpdate } = useTodoStore();
  return (
    <div className="flex flex-col">
      <TaskUpdateComposer onSubmit={(content) => addTaskUpdate(task.id, content)} />
      <TaskUpdateList updates={updates} loading={loading} />
    </div>
  );
}
