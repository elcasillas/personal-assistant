"use client";
import { useEffect, useRef, useState } from "react";
import { X, MoreHorizontal, Trash2, ArrowRight, User } from "lucide-react";
import { FollowUpUpdatesTab } from "./FollowUpUpdatesTab";
import { FollowUpActivityLogTab } from "./FollowUpActivityLogTab";
import { StatusPill } from "@/components/todo/ui/StatusPill";
import { PriorityPill } from "@/components/todo/ui/PriorityPill";
import { ConfirmDialog } from "@/components/todo/ui/ConfirmDialog";
import { useFollowUpStore } from "@/store/useFollowUpStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn, formatDate } from "@/lib/todo-utils";
import type { FollowUpItem, FollowUpUpdate } from "@/lib/followup-types";

type PanelTab = "updates" | "activity";

interface FollowUpSidePanelProps {
  item: FollowUpItem;
  updates: FollowUpUpdate[];
  updatesLoading: boolean;
  onClose: () => void;
}

export function FollowUpSidePanel({ item, updates, updatesLoading, onClose }: FollowUpSidePanelProps) {
  const { groups, deleteItem, moveBetweenGroups } = useFollowUpStore();
  const [activeTab, setActiveTab] = useState<PanelTab>("updates");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  useEffect(() => {
    if (!showMoveModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowMoveModal(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showMoveModal]);

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  const currentGroup = groups.find((g) => g.id === item.groupId);

  const handleDelete = () => { setShowDeleteConfirm(false); deleteItem(item.id); };
  const handleMove = (toGroupId: string) => { setShowMoveModal(false); moveBetweenGroups(item.id, toGroupId); };

  const tabs: { id: PanelTab; label: string; count?: number }[] = [
    { id: "updates", label: "Updates", count: updates.length || undefined },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0" aria-label="Close panel">
          <X className="w-4 h-4" />
        </button>
        <h2 className="flex-1 text-sm font-bold text-slate-900 truncate min-w-0">{item.subject}</h2>
        {item.contactName && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 truncate max-w-[100px]">{item.contactName}</span>
          </div>
        )}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Follow-up actions">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-[180px] py-1">
              <button onClick={() => { setMenuOpen(false); setShowMoveModal(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" /> Move to group
              </button>
              <hr className="border-slate-100 my-0.5" />
              <button onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete follow-up
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-2 flex-shrink-0">
        <StatusPill status={item.status} compact />
        <PriorityPill priority={item.priority} compact />
        {item.dueDate && <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">Due {formatDate(item.dueDate)}</span>}
        {currentGroup && (
          <span className="text-xs text-slate-400 bg-slate-50 rounded px-2 py-0.5 border-l-2" style={{ borderColor: currentGroup.color }}>
            {currentGroup.name}
          </span>
        )}
      </div>

      <div className="flex border-b border-slate-200 flex-shrink-0 px-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab.id ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-200"
            )}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-1.5 py-px leading-none">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "updates" && <FollowUpUpdatesTab item={item} updates={updates} loading={updatesLoading} />}
        {activeTab === "activity" && <FollowUpActivityLogTab item={item} updates={updates} />}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete follow-up"
          message={`"${item.subject}" will be permanently deleted along with all its updates. This cannot be undone.`}
          confirmLabel="Delete follow-up"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowMoveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="text-base font-semibold text-slate-900">Move to group</h3>
              <button onClick={() => setShowMoveModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="px-5 pb-3 text-xs text-slate-400 truncate">Select a destination group for &ldquo;{item.subject}&rdquo;.</p>
            <div className="px-3 pb-4 space-y-0.5 max-h-64 overflow-y-auto">
              {sortedGroups.map((group) => {
                const isCurrent = group.id === item.groupId;
                return (
                  <button key={group.id} onClick={() => !isCurrent && handleMove(group.id)} disabled={isCurrent}
                    className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                      isCurrent ? "bg-slate-50 text-slate-400 cursor-default" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700")}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                    <span className="flex-1">{group.name}</span>
                    {isCurrent && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
