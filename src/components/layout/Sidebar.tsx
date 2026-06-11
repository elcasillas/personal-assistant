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
  LogOut,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Section } from "@/lib/types";
import { useUser } from "@/hooks/useUser";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  aiOpen: boolean;
  onToggleAI: () => void;
  onClose?: () => void;
}

const navItems: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "tasks",     label: "Tasks",      icon: CheckSquare },
  { id: "followups", label: "Follow-ups", icon: Clock },
  { id: "notes",     label: "Notes",      icon: FileText },
  { id: "drafts",    label: "Drafts",     icon: Mail },
  { id: "contacts",  label: "Contacts",   icon: Users },
  { id: "routines",  label: "Routines",   icon: Zap },
];

export default function Sidebar({
  activeSection,
  onSectionChange,
  aiOpen,
  onToggleAI,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const { user } = useUser();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[220px] h-full min-h-screen bg-slate-900 flex flex-col shrink-0 overflow-y-auto">
      {/* Logo + mobile close button */}
      <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
        <Image
          src="/linda-logo.png"
          alt="Linda"
          width={140}
          height={44}
          className="object-contain"
          priority
        />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2 shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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

        {/* Calendar - coming soon */}
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

        {/* Settings */}
        <button
          onClick={() => onSectionChange("settings")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
            activeSection === "settings"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>

      {/* Logged-in user */}
      {user && (
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs font-medium text-slate-300 truncate">{user.name}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
          <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
            user.role === "admin"
              ? "bg-indigo-900 text-indigo-300"
              : "bg-slate-800 text-slate-400"
          }`}>
            {user.role}
          </span>
        </div>
      )}
    </aside>
  );
}
