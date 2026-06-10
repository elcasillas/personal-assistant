"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./layout/Sidebar";
import TodoModule from "./todo/TodoModule";
import NoteList from "./notes/NoteList";
import ContactList from "./contacts/ContactList";
import FollowUpModule from "./followups/FollowUpModule";
import DraftList from "./drafts/DraftList";
import UserSettings from "./settings/UserSettings";
import AIAssistant from "./ai/AIAssistant";
import type { Section } from "@/lib/types";

const SECTION_STORAGE_KEY = "linda_active_section";
const PERSISTABLE_SECTIONS: Section[] = ["tasks", "notes", "contacts", "followups", "drafts"];

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
    // Settings is route-driven (/settings), so always trust the prop for it.
    if (defaultSection === "settings") return "settings";
    return readPersistedSection(defaultSection);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const router = useRouter();

  function handleSectionChange(section: Section) {
    setActiveSection(section);
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
      case "settings":  return <UserSettings />;
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen((prev) => !prev)}
      />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {(activeSection === "tasks" || activeSection === "followups") ? (
          <div className="flex flex-1 min-h-0 px-6 py-4 overflow-hidden">
            {renderSection()}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-8 w-full overflow-y-auto flex-1">
            {renderSection()}
          </div>
        )}
      </main>

      {aiOpen && (
        <AIAssistant onClose={() => setAiOpen(false)} />
      )}
    </div>
  );
}
