export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type FollowUpStatus = 'pending' | 'completed';
export type DraftType = 'email' | 'letter' | 'memo' | 'other';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  contactId?: string;
  contactName: string;
  subject: string;
  dueDate: string;
  status: FollowUpStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Draft {
  id: string;
  type: DraftType;
  subject: string;
  content: string;
  to?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type Section = 'home' | 'tasks' | 'notes' | 'contacts' | 'followups' | 'drafts' | 'routines' | 'settings';

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description: string;
  triggerPhrases: string[];
  instructions: string;
  dataSources: string[];
  outputFormat: string;
  active: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineRun {
  id: string;
  userId: string;
  routineId: string;
  routineName: string;
  output: string;
  status: 'running' | 'success' | 'failed';
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
}
