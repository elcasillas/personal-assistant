"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare,
  Clock,
  FileText,
  Mail,
  Users,
  Zap,
} from "lucide-react";
import type { Section } from "@/lib/types";
import { useUser } from "@/hooks/useUser";

interface Summary {
  tasks:     { open: number };
  followups: { open: number };
  notes:     { active: number };
  drafts:    { total: number };
  contacts:  { total: number };
  routines:  { active: number };
}

interface Card {
  id: Section;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  iconBg: string;
  badge: (s: Summary) => string | null;
}

const CARDS: Card[] = [
  {
    id: "tasks",
    icon: CheckSquare,
    title: "Tasks",
    description: "View and manage your tasks, priorities, statuses, and due dates.",
    color: "text-indigo-600",
    iconBg: "bg-indigo-100",
    badge: (s) => s.tasks.open > 0 ? `${s.tasks.open} open` : "All clear",
  },
  {
    id: "followups",
    icon: Clock,
    title: "Follow-ups",
    description: "Track people, groups, updates, and pending follow-up items.",
    color: "text-amber-600",
    iconBg: "bg-amber-100",
    badge: (s) => s.followups.open > 0 ? `${s.followups.open} pending` : "All caught up",
  },
  {
    id: "notes",
    icon: FileText,
    title: "Notes",
    description: "Create, review, and organize active notes.",
    color: "text-emerald-600",
    iconBg: "bg-emerald-100",
    badge: (s) => `${s.notes.active} ${s.notes.active === 1 ? "note" : "notes"}`,
  },
  {
    id: "drafts",
    icon: Mail,
    title: "Drafts",
    description: "Review and manage saved drafts.",
    color: "text-sky-600",
    iconBg: "bg-sky-100",
    badge: (s) => s.drafts.total > 0 ? `${s.drafts.total} saved` : null,
  },
  {
    id: "contacts",
    icon: Users,
    title: "Contacts",
    description: "View and manage contacts used by Linda.",
    color: "text-violet-600",
    iconBg: "bg-violet-100",
    badge: (s) => s.contacts.total > 0 ? `${s.contacts.total} contacts` : null,
  },
  {
    id: "routines",
    icon: Zap,
    title: "Routines",
    description: "Run, edit, and manage automated routines.",
    color: "text-rose-600",
    iconBg: "bg-rose-100",
    badge: (s) => s.routines.active > 0 ? `${s.routines.active} active` : null,
  },
];

function greeting(name: string) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0];
  return `${time}, ${first}`;
}

interface HomeDashboardProps {
  onSectionChange: (section: Section) => void;
}

export default function HomeDashboard({ onSectionChange }: HomeDashboardProps) {
  const { user } = useUser();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSummary(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
          {user ? greeting(user.name) : "Welcome to Linda"}
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          What would you like to work on today?
        </p>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(({ id, icon: Icon, title, description, color, iconBg, badge }) => {
          const badgeText = summary ? badge(summary) : null;

          return (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              className="group text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-lg ${iconBg} shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                {badgeText && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                    {badgeText}
                  </span>
                )}
              </div>

              <div className="mt-4">
                <h2 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {title}
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
