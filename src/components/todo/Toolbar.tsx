"use client";
import { useRef, useState } from "react";
import { Plus, Search, SlidersHorizontal, ArrowUpDown, Eye, EyeOff, X, ChevronDown, Check } from "lucide-react";
import { useTodoStore } from "@/store/useTodoStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import { STATUS_CONFIG } from "./ui/StatusPill";
import { PRIORITY_CONFIG } from "./ui/PriorityPill";
import { cn } from "@/lib/todo-utils";
import type { TaskStatus, TaskPriority, SortField } from "@/lib/todo-types";

interface ToolbarProps {
  onAddTask: (groupId?: string) => void;
}

export function Toolbar({ onAddTask }: ToolbarProps) {
  const { filter, setFilter, clearFilters, sort, setSort, hiddenColumns, toggleColumn, groups, tasks, showDoneTasks, toggleShowDoneTasks } = useTodoStore();

  const hiddenDoneCount = !showDoneTasks ? tasks.filter((t) => t.status === "done").length : 0;

  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showHide, setShowHide] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const hideRef = useRef<HTMLDivElement>(null);
  const newTaskRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterRef, () => setShowFilter(false), showFilter);
  useClickOutside(sortRef, () => setShowSort(false), showSort);
  useClickOutside(hideRef, () => setShowHide(false), showHide);
  useClickOutside(newTaskRef, () => setShowNewTask(false), showNewTask);

  const hasActiveFilters = filter.search || filter.owner || filter.status || filter.priority;

  const sortFields: { field: SortField; label: string }[] = [
    { field: "title", label: "Task name" }, { field: "status", label: "Status" },
    { field: "priority", label: "Priority" }, { field: "dueDate", label: "Due date" }, { field: "owner", label: "Owner" },
  ];

  const columnLabels: Record<string, string> = { owner: "Owner", status: "Status", dueDate: "Due date", priority: "Priority", notes: "Notes" };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div ref={newTaskRef} className="relative">
        <div className="flex rounded-lg overflow-hidden shadow-sm">
          <button onClick={() => onAddTask()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-white text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> New Task
          </button>
          <button onClick={() => setShowNewTask(!showNewTask)}
            className="px-2 py-2 text-white transition-colors border-l border-white/20 bg-indigo-600 hover:bg-indigo-700">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        {showNewTask && (
          <div className="absolute left-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-[200px] py-1">
            <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Add to group</p>
            {groups.sort((a, b) => a.order - b.order).map((g) => (
              <button key={g.id} onClick={() => { onAddTask(g.id); setShowNewTask(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: g.color }} />{g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input type="text" placeholder="Search tasks…" value={filter.search} onChange={(e) => setFilter({ search: e.target.value })}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
        {filter.search && <button onClick={() => setFilter({ search: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
      </div>

      <div ref={filterRef} className="relative">
        <button onClick={() => setShowFilter(!showFilter)}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
            hasActiveFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
          {hasActiveFilters && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {[filter.status, filter.priority, filter.owner].filter(Boolean).length}
            </span>
          )}
        </button>
        {showFilter && (
          <div className="absolute left-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-lg border border-slate-200 w-64 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Filters</p>
              {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Clear all</button>}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                  <button key={s} onClick={() => setFilter({ status: filter.status === s ? "" : s })}
                    className={cn("px-2 py-1 rounded text-[11px] font-semibold transition-all", STATUS_CONFIG[s].className,
                      filter.status === s ? "ring-2 ring-offset-1 ring-blue-500" : "opacity-60 hover:opacity-90")}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Priority</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                  <button key={p} onClick={() => setFilter({ priority: filter.priority === p ? "" : p })}
                    className={cn("px-2 py-1 rounded text-[11px] font-semibold transition-all", PRIORITY_CONFIG[p].className,
                      filter.priority === p ? "ring-2 ring-offset-1 ring-blue-500" : "opacity-60 hover:opacity-90")}>
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Owner</p>
              <input type="text" placeholder="Filter by name…" value={filter.owner} onChange={(e) => setFilter({ owner: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
          </div>
        )}
      </div>

      <div ref={sortRef} className="relative">
        <button onClick={() => setShowSort(!showSort)}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
            sort.field ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
          <ArrowUpDown className="w-3.5 h-3.5" /> Sort
          {sort.field && <span className="text-[10px] font-bold text-blue-600">{sort.direction === "asc" ? "↑" : "↓"}</span>}
        </button>
        {showSort && (
          <div className="absolute left-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-lg border border-slate-200 w-48 py-2">
            <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sort by</p>
            {sortFields.map(({ field, label }) => (
              <button key={field} onClick={() => { setSort(field); setShowSort(false); }}
                className={cn("w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors",
                  sort.field === field ? "text-blue-600 font-medium" : "text-slate-700")}>
                {label}
                {sort.field === field && <span className="text-xs text-blue-500">{sort.direction === "asc" ? "A→Z" : "Z→A"}</span>}
              </button>
            ))}
            {sort.field && (
              <>
                <hr className="my-1 border-slate-100" />
                <button onClick={() => { setSort(""); setShowSort(false); }} className="w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 text-left">Clear sort</button>
              </>
            )}
          </div>
        )}
      </div>

      <div ref={hideRef} className="relative">
        <button onClick={() => setShowHide(!showHide)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          <Eye className="w-3.5 h-3.5" /> Hide
        </button>
        {showHide && (
          <div className="absolute right-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-lg border border-slate-200 w-48 py-2">
            <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Columns</p>
            {(Object.keys(columnLabels) as (keyof typeof hiddenColumns)[]).map((col) => (
              <button key={col} onClick={() => toggleColumn(col)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                {columnLabels[col]}
                <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                  !hiddenColumns[col] ? "border-blue-500 bg-blue-500" : "border-slate-300")}>
                  {!hiddenColumns[col] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={toggleShowDoneTasks}
        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
          !showDoneTasks ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
        {showDoneTasks ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{showDoneTasks ? "Hide done" : "Show done"}</span>
      </button>

      {hiddenDoneCount > 0 && <span className="text-xs text-slate-400 whitespace-nowrap">{hiddenDoneCount} done hidden</span>}
    </div>
  );
}
