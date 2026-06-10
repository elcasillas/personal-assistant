import type { TaskStatus, TaskPriority } from "@/lib/todo-types";

// Re-use the same status/priority enums so StatusPill and PriorityPill work without casting
export type FollowUpStatus = TaskStatus;
export type FollowUpPriority = TaskPriority;

export interface FollowUpGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
}

export interface FollowUpItem {
  id: string;
  subject: string;
  contactName: string;
  contactId?: string | null;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  dueDate?: string | null;
  notes: string;
  completed: boolean;
  groupId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpUpdate {
  id: string;
  followupId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpFilterState {
  search: string;
  contact: string;
  status: FollowUpStatus | "";
  priority: FollowUpPriority | "";
}

export type FollowUpSortField = "subject" | "status" | "dueDate" | "priority" | "contactName" | "";
export type FollowUpSortDirection = "asc" | "desc";

export interface FollowUpSortState {
  field: FollowUpSortField;
  direction: FollowUpSortDirection;
}

export interface FollowUpHiddenColumns {
  contactName: boolean;
  status: boolean;
  dueDate: boolean;
  priority: boolean;
  notes: boolean;
}
