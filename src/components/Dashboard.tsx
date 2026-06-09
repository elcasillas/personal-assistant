"use client";

import { useState } from "react";
import Sidebar from "./layout/Sidebar";
import TaskList from "./tasks/TaskList";
import NoteList from "./notes/NoteList";
import ContactList from "./contacts/ContactList";
import FollowUpList from "./followups/FollowUpList";
import DraftList from "./drafts/DraftList";
import AIAssistant from "./ai/AIAssistant";
import type { Section } from "@/lib/types";

export default function DashboardClient() {
  const [activeSection, setActiveSection] = useState<Section>("tasks");
  const [aiOpen, setAiOpen] = useState(false);

  function renderSection() {
    switch (activeSection) {
      case "tasks":
        return <TaskList />;
      case "notes":
        return <NoteList />;
      case "contacts":
        return <ContactList />;
      case "followups":
        return <FollowUpList />;
      case "drafts":
        return <DraftList />;
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen((prev) => !prev)}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {renderSection()}
        </div>
      </main>

      {/* AI Assistant panel */}
      {aiOpen && (
        <AIAssistant onClose={() => setAiOpen(false)} />
      )}
    </div>
  );
}
