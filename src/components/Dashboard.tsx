"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, Bot } from "lucide-react";
import Sidebar from "./layout/Sidebar";
import TodoModule from "./todo/TodoModule";
import NoteList from "./notes/NoteList";
import ContactList from "./contacts/ContactList";
import FollowUpModule from "./followups/FollowUpModule";
import DraftList from "./drafts/DraftList";
import UserSettings from "./settings/UserSettings";
import RoutineList from "./routines/RoutineList";
import AIAssistant from "./ai/AIAssistant";
import type { Section } from "@/lib/types";

const SECTION_STORAGE_KEY = "linda_active_section";
const PERSISTABLE_SECTIONS: Section[] = ["tasks", "notes", "contacts", "followups", "drafts", "routines"];

function readPersistedSection(fallback: Section): Section {
  try {
    const saved = localStorage.getItem(SECTION_STORAGE_KEY);
    if (saved && (PERSISTABLE_SECTIONS as string[]).includes(saved)) return saved as Section;
  } catch {
    // localStorage unavailable (SSR or privacy mode)
  }
  return fallback;
}

interface DashboardClientProps {
  defaultSection?: Section;
}

export default function DashboardClient({ defaultSection = "tasks" }: DashboardClientProps) {
  const [activeSection, setActiveSection] = useState<Section>(() => {
    if (defaultSection === "settings") return "settings";
    return readPersistedSection(defaultSection);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    setMobileNavOpen(false);
    if ((PERSISTABLE_SECTIONS as string[]).includes(section)) {
      try { localStorage.setItem(SECTION_STORAGE_KEY, section); } catch {}
    }
    if (section === "settings" && defaultSection !== "settings") {
      router.push("/settings");
    } else if (section !== "settings" && defaultSection === "settings") {
      router.push("/dashboard");
    }
  }

  function renderSection() {
    switch (activeSection) {
      case "tasks":     return <TodoModule />;
      case "notes":     return <NoteList />;
      case "contacts":  return <ContactList />;
      case "followups": return <FollowUpModule />;
      case "drafts":    return <DraftList />;
      case "routines":  return <RoutineList />;
      case "settings":  return <UserSettings />;
    }
  }

  const isFullHeight = activeSection === "tasks" || activeSection === "followups";

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* ── Mobile top bar (hidden on lg+) ───────────────────────── */}
      <header className="lg:hidden shrink-0 bg-slate-900 flex items-center justify-between px-4 py-2.5 border-b border-slate-800 z-20">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Image
          src="/linda-logo.png"
          alt="Linda"
          width={110}
          height={36}
          className="h-8 w-auto object-contain"
          unoptimized
        />
        <button
          onClick={() => setAiOpen((v) => !v)}
          className={`p-2 rounded-lg transition-colors ${
            aiOpen ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          aria-label="Toggle AI assistant"
        >
          <Bot className="w-5 h-5" />
        </button>
      </header>

      {/* ── Main layout row ───────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mobile nav backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200 ${
            mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileNavOpen(false)}
        />

        {/* Sidebar — drawer on mobile, always visible on lg+ */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:relative lg:inset-auto lg:translate-x-0 lg:z-auto ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <Sidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            aiOpen={aiOpen}
            onToggleAI={() => { setAiOpen((prev) => !prev); setMobileNavOpen(false); }}
            onClose={() => setMobileNavOpen(false)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {isFullHeight ? (
            <div className="flex flex-1 min-h-0 px-3 sm:px-6 py-3 sm:py-4 overflow-hidden">
              {renderSection()}
            </div>
          ) : (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full overflow-y-auto flex-1">
              {renderSection()}
            </div>
          )}
        </main>

        {/* AI Assistant — full-screen overlay on mobile, side panel on lg+ */}
        {aiOpen && (
          <div className="fixed inset-0 z-40 flex lg:relative lg:inset-auto lg:z-auto">
            <div
              className="flex-1 bg-black/30 lg:hidden"
              onClick={() => setAiOpen(false)}
            />
            <AIAssistant onClose={() => setAiOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
