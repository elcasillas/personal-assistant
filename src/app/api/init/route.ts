import { NextResponse } from "next/server";
import { d1Execute } from "@/lib/d1";

const tables = [
  {
    name: "tasks",
    sql: `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "notes",
    sql: `CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      archived INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "contacts",
    sql: `CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      title TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "followups",
    sql: `CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY,
      contact_id TEXT,
      contact_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "drafts",
    sql: `CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'email',
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      recipient TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "users",
    sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "todo_groups",
    sql: `CREATE TABLE IF NOT EXISTS todo_groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      collapsed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
  },
  {
    name: "todo_tasks",
    sql: `CREATE TABLE IF NOT EXISTS todo_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      owner_name TEXT,
      owner_initials TEXT,
      owner_color TEXT,
      owner_avatar TEXT,
      status TEXT NOT NULL DEFAULT 'not_started',
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      notes TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      group_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "todo_task_updates",
    sql: `CREATE TABLE IF NOT EXISTS todo_task_updates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_initials TEXT NOT NULL,
      author_color TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "followup_groups",
    sql: `CREATE TABLE IF NOT EXISTS followup_groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      collapsed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
  },
  {
    name: "followup_items",
    sql: `CREATE TABLE IF NOT EXISTS followup_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      contact_name TEXT NOT NULL DEFAULT '',
      contact_id TEXT,
      status TEXT NOT NULL DEFAULT 'not_started',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      group_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "followup_updates",
    sql: `CREATE TABLE IF NOT EXISTS followup_updates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      followup_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_initials TEXT NOT NULL,
      author_color TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "routines",
    sql: `CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      trigger_phrases TEXT NOT NULL DEFAULT '[]',
      instructions TEXT NOT NULL DEFAULT '',
      data_sources TEXT NOT NULL DEFAULT '[]',
      output_format TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
  {
    name: "routine_runs",
    sql: `CREATE TABLE IF NOT EXISTS routine_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      routine_id TEXT NOT NULL,
      routine_name TEXT NOT NULL DEFAULT '',
      output TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'success',
      error TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    )`,
  },
  {
    name: "routine_runs_idx_routine",
    sql: `CREATE INDEX IF NOT EXISTS idx_routine_runs_routine_id ON routine_runs (routine_id)`,
  },
  {
    name: "routine_runs_idx_user",
    sql: `CREATE INDEX IF NOT EXISTS idx_routine_runs_user_id ON routine_runs (user_id)`,
  },
  {
    name: "routine_runs_idx_created",
    sql: `CREATE INDEX IF NOT EXISTS idx_routine_runs_created_at ON routine_runs (created_at)`,
  },
];

export async function POST() {
  const results: { table: string; status: string; error?: string }[] = [];

  for (const table of tables) {
    try {
      await d1Execute(table.sql);
      results.push({ table: table.name, status: "ok" });
    } catch (err) {
      results.push({ table: table.name, status: "error", error: String(err) });
    }
  }

  const hasErrors = results.some((r) => r.status === "error");
  return NextResponse.json({ results }, { status: hasErrors ? 500 : 200 });
}
