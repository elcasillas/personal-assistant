"use client";

import {
  CheckSquare,
  FileText,
  Users,
  Clock,
  Mail,
  Bot,
  Calendar,
  Settings,
} from "lucide-react";
import type { Section } from "@/lib/types";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  aiOpen: boolean;
  onToggleAI: () => void;
}

const navItems: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "followups", label: "Follow-ups", icon: Clock },
  { id: "drafts", label: "Drafts", icon: Mail },
];

export default function Sidebar({
  activeSection,
  onSectionChange,
  aiOpen,
  onToggleAI,
}: SidebarProps) {
  return (
    <aside className="w-[220px] min-h-screen bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">L</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            Linda
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        {/* AI Toggle */}
        <button
          onClick={onToggleAI}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
            aiOpen
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          Linda
        </button>

        {/* Gmail - coming soon */}
        <div className="relative group">
          <button
            disabled
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed"
          >
            <Mail className="w-4 h-4 shrink-0" />
            Gmail
            <span className="ml-auto text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
              Soon
            </span>
          </button>
        </div>

        {/* Calendar - coming soon */}
        <div className="relative group">
          <button
            disabled
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Calendar
            <span className="ml-auto text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
              Soon
            </span>
          </button>
        </div>

        {/* Settings */}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </button>
      </div>
    </aside>
  );
}
