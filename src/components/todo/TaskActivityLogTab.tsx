"use client";
import { CheckCircle2, MessageSquare, Circle } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/todo-utils";
import type { Task, TaskUpdate } from "@/lib/todo-types";

interface ActivityEvent {
  id: string;
  type: "task_created" | "update_added";
  label: string;
  actorName: string | null;
  createdAt: string;
}

function buildActivityLog(task: Task, updates: TaskUpdate[]): ActivityEvent[] {
  const events: ActivityEvent[] = [
    { id: `created-${task.id}`, type: "task_created", label: "Task created", actorName: task.owner?.name ?? null, createdAt: task.createdAt },
    ...updates.map((u) => ({ id: `update-${u.id}`, type: "update_added" as const, label: "Posted an update", actorName: u.authorName, createdAt: u.createdAt })),
  ];
  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const EVENT_STYLE: Record<ActivityEvent["type"], { Icon: typeof Circle; colors: string }> = {
  task_created: { Icon: CheckCircle2, colors: "text-emerald-600 bg-emerald-50" },
  update_added: { Icon: MessageSquare, colors: "text-blue-600 bg-blue-50" },
};

interface TaskActivityLogTabProps {
  task: Task;
  updates: TaskUpdate[];
}

export function TaskActivityLogTab({ task, updates }: TaskActivityLogTabProps) {
  const events = buildActivityLog(task, updates);
  return (
    <div className="px-4 py-5">
      <div className="relative">
        {events.length > 1 && <div className="absolute left-3.5 top-3 bottom-3 w-px bg-slate-100" />}
        <div className="space-y-5">
          {events.map((event) => {
            const { Icon, colors } = EVENT_STYLE[event.type];
            return (
              <div key={event.id} className="flex gap-3 relative">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10", colors)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 pt-0.5 min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">
                    {event.actorName && <span className="font-semibold">{event.actorName} </span>}
                    {event.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(event.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
