export type TaskStatus = "not_started" | "working" | "done" | "stuck";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskOwner {
  name: string;
  avatar?: string;
  initials: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  owner?: TaskOwner | null;
  status: TaskStatus;
  dueDate?: string | null;
  priority: TaskPriority;
  notes?: string;
  completed: boolean;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
}

export interface FilterState {
  search: string;
  owner: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
}

export type SortField = "title" | "status" | "dueDate" | "priority" | "owner" | "";
export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface HiddenColumns {
  owner: boolean;
  status: boolean;
  dueDate: boolean;
  priority: boolean;
  notes: boolean;
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoOwner {
  id: string;
  name: string;
  color: string;
  initials: string;
}
