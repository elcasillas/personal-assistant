"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./layout/Sidebar";
import TaskList from "./tasks/TaskList";
import NoteList from "./notes/NoteList";
import ContactList from "./contacts/ContactList";
import FollowUpList from "./followups/FollowUpList";
import DraftList from "./drafts/DraftList";
import UserSettings from "./settings/UserSettings";
import AIAssistant from "./ai/AIAssistant";
import type { Section } from "@/lib/types";

interface DashboardClientProps {
  defaultSection?: Section;
}

export default function DashboardClient({ defaultSection = "tasks" }: DashboardClientProps) {
  const [activeSection, setActiveSection] = useState<Section>(defaultSection);
  const [aiOpen, setAiOpen] = useState(false);
  const router = useRouter();

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    if (section === "settings" && defaultSection !== "settings") {
      router.push("/settings");
    } else if (section !== "settings" && defaultSection === "settings") {
      router.push("/dashboard");
    }
  }

  function renderSection() {
    switch (activeSection) {
      case "tasks":     return <TaskList />;
      case "notes":     return <NoteList />;
      case "contacts":  return <ContactList />;
      case "followups": return <FollowUpList />;
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

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {renderSection()}
        </div>
      </main>

      {aiOpen && (
        <AIAssistant onClose={() => setAiOpen(false)} />
      )}
    </div>
  );
}
