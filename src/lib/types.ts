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

export type Section = 'tasks' | 'notes' | 'contacts' | 'followups' | 'drafts' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
}
