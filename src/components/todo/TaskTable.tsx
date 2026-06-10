"use client";
import { useState } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, GripVertical, X } from "lucide-react";
import { GroupSection } from "./GroupSection";
import { StatusPill } from "./ui/StatusPill";
import { PriorityPill } from "./ui/PriorityPill";
import { useTodoStore, getFilteredGroupTasks } from "@/store/useTodoStore";
import { cn } from "@/lib/todo-utils";
import type { Task, Group } from "@/lib/todo-types";

interface TaskTableProps {
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (groupId?: string) => void;
}

function TaskDragOverlayContent({ task }: { task: Task }) {
  return (
    <div className="bg-white shadow-2xl rounded-xl border border-blue-300 px-4 py-3 flex items-center gap-3 opacity-95 max-w-md">
      <input type="checkbox" checked={task.completed} readOnly className="w-3.5 h-3.5" />
      <span className={cn("text-sm font-medium flex-1 truncate", task.completed ? "line-through text-slate-400" : "text-slate-800")}>{task.title}</span>
      <StatusPill status={task.status} compact />
      <PriorityPill priority={task.priority} compact />
    </div>
  );
}

function GroupDragOverlayContent({ group }: { group: Group }) {
  return (
    <div className="bg-white shadow-xl rounded-xl border border-slate-300 px-4 py-2.5 flex items-center gap-2 opacity-95">
      <GripVertical className="w-4 h-4 text-slate-400" />
      <span className="text-sm font-bold" style={{ color: group.color }}>{group.name}</span>
    </div>
  );
}

export function TaskTable({ onEditTask, onDeleteTask, onAddTask }: TaskTableProps) {
  const { tasks, groups, filter, sort, hiddenColumns, showDoneTasks, reorderTasks, moveBetweenGroups, addGroup, reorderGroups, groupReorderError, clearGroupReorderError } = useTodoStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type as string | undefined;
    if (type === "group") { setActiveGroup(groups.find((g) => g.id === event.active.id) ?? null); setActiveTask(null); }
    else { setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null); setActiveGroup(null); }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null); setActiveGroup(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeType = active.data.current?.type as string | undefined;
    if (activeType === "group") { reorderGroups(activeId, overId); return; }

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    const overGroup = groups.find((g) => g.id === overId);
    if (overGroup) { if (activeTaskItem.groupId !== overGroup.id) moveBetweenGroups(activeId, overGroup.id); return; }

    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (activeTaskItem.groupId === overTask.groupId) reorderTasks(activeTaskItem.groupId, activeId, overId);
    else moveBetweenGroups(activeId, overTask.groupId, overId);
  }

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (name) { addGroup(name); setNewGroupName(""); setAddingGroup(false); }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {groupReorderError && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <span className="flex-1">{groupReorderError}</span>
          <button onClick={clearGroupReorderError} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}
      <SortableContext items={sortedGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        {sortedGroups.map((group) => (
          <GroupSection key={group.id} group={group} tasks={getFilteredGroupTasks(tasks, group.id, filter, sort, showDoneTasks)}
            onEditTask={onEditTask} onDeleteTask={onDeleteTask} onAddTask={onAddTask} hiddenColumns={hiddenColumns} allGroups={sortedGroups} />
        ))}
      </SortableContext>
      <div className="mt-2">
        {addingGroup ? (
          <div className="flex items-center gap-2">
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); } }}
              placeholder="Group name…" autoFocus className="px-3 py-1.5 text-sm border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 w-48" />
            <button onClick={handleAddGroup} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Add</button>
            <button onClick={() => { setAddingGroup(false); setNewGroupName(""); }} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingGroup(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add group
          </button>
        )}
      </div>
      <DragOverlay>
        {activeTask ? <TaskDragOverlayContent task={activeTask} /> : null}
        {activeGroup ? <GroupDragOverlayContent group={activeGroup} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
