"use client";
import { useState } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, GripVertical, X } from "lucide-react";
import { FollowUpGroupSection } from "./FollowUpGroupSection";
import { StatusPill } from "@/components/todo/ui/StatusPill";
import { PriorityPill } from "@/components/todo/ui/PriorityPill";
import { useFollowUpStore, getFilteredGroupItems } from "@/store/useFollowUpStore";
import { cn } from "@/lib/todo-utils";
import type { FollowUpItem, FollowUpGroup } from "@/lib/followup-types";

interface FollowUpTableProps {
  onEditItem: (item: FollowUpItem) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (groupId?: string) => void;
}

function ItemDragOverlayContent({ item }: { item: FollowUpItem }) {
  return (
    <div className="bg-white shadow-2xl rounded-xl border border-blue-300 px-4 py-3 flex items-center gap-3 opacity-95 max-w-md">
      <input type="checkbox" checked={item.completed} readOnly className="w-3.5 h-3.5" />
      <span className={cn("text-sm font-medium flex-1 truncate", item.completed ? "line-through text-slate-400" : "text-slate-800")}>{item.subject}</span>
      <StatusPill status={item.status} compact />
      <PriorityPill priority={item.priority} compact />
    </div>
  );
}

function GroupDragOverlayContent({ group }: { group: FollowUpGroup }) {
  return (
    <div className="bg-white shadow-xl rounded-xl border border-slate-300 px-4 py-2.5 flex items-center gap-2 opacity-95">
      <GripVertical className="w-4 h-4 text-slate-400" />
      <span className="text-sm font-bold" style={{ color: group.color }}>{group.name}</span>
    </div>
  );
}

export function FollowUpTable({ onEditItem, onDeleteItem, onAddItem }: FollowUpTableProps) {
  const { items, groups, filter, sort, hiddenColumns, showDoneItems, reorderItems, moveBetweenGroups, addGroup, reorderGroups, groupReorderError, clearGroupReorderError, groupDeleteError, clearGroupDeleteError } = useFollowUpStore();

  const [activeItem, setActiveItem] = useState<FollowUpItem | null>(null);
  const [activeGroup, setActiveGroup] = useState<FollowUpGroup | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type as string | undefined;
    if (type === "group") { setActiveGroup(groups.find((g) => g.id === event.active.id) ?? null); setActiveItem(null); }
    else { setActiveItem(items.find((t) => t.id === event.active.id) ?? null); setActiveGroup(null); }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null); setActiveGroup(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeType = active.data.current?.type as string | undefined;
    if (activeType === "group") { reorderGroups(activeId, overId); return; }

    const activeItemData = items.find((t) => t.id === activeId);
    if (!activeItemData) return;

    const overGroup = groups.find((g) => g.id === overId);
    if (overGroup) { if (activeItemData.groupId !== overGroup.id) moveBetweenGroups(activeId, overGroup.id); return; }

    const overItem = items.find((t) => t.id === overId);
    if (!overItem) return;

    if (activeItemData.groupId === overItem.groupId) reorderItems(activeItemData.groupId, activeId, overId);
    else moveBetweenGroups(activeId, overItem.groupId, overId);
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
      {groupDeleteError && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <span className="flex-1">{groupDeleteError}</span>
          <button onClick={clearGroupDeleteError} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}
      <SortableContext items={sortedGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        {sortedGroups.map((group) => (
          <FollowUpGroupSection key={group.id} group={group} items={getFilteredGroupItems(items, group.id, filter, sort, showDoneItems)}
            onEditItem={onEditItem} onDeleteItem={onDeleteItem} onAddItem={onAddItem} hiddenColumns={hiddenColumns} allGroups={sortedGroups} />
        ))}
      </SortableContext>
      <div className="mt-2">
        {addingGroup ? (
          <div className="flex items-center gap-2">
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); } }}
              placeholder="Group name…" autoFocus className="px-3 py-1.5 text-sm border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 w-48" />
            <button onClick={handleAddGroup} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Add</button>
            <button onClick={() => { setAddingGroup(false); setNewGroupName(""); }} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingGroup(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add group
          </button>
        )}
      </div>
      <DragOverlay>
        {activeItem ? <ItemDragOverlayContent item={activeItem} /> : null}
        {activeGroup ? <GroupDragOverlayContent group={activeGroup} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
