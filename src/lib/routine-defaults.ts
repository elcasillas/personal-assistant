export const DAILY_SUMMARY_NAME = "Daily Due and Overdue Summary";

export const DAILY_SUMMARY_INSTRUCTIONS = `Generate an executive-friendly daily summary of all Tasks and Follow-ups that are due today or overdue.

STEP 1 — FILTER ITEMS:
- Include only items where due_date equals today OR due_date is before today.
- Exclude items with no due date.
- Items marked completed/done go into the "Completed or No-Action Items" section only — do not list them under Due Today or Overdue.

STEP 2 — FOR EACH ITEM, GENERATE:
- A concise 1–3 sentence executive summary rewritten from the notes field. If notes are empty or unclear, write: "Next step needs clarification."
- A clear recommended next step written as a direct actionable recommendation.
- For overdue items: calculate days overdue based on today's date.

STEP 3 — SORT ORDER:
- Overdue: sort by oldest due date first.
- Due Today: sort by priority (urgent → high → medium → low), then by due date.
- High-Priority Action Items: include only urgent or high priority items from both sections.

STEP 4 — BUILD THE SUGGESTED DAILY ACTION PLAN:
- Short prioritized bullet list based on what you found.

IMPORTANT RULES:
- Do not create, edit, or delete any tasks or follow-ups.
- Follow-ups must stay under Follow-ups. Do not reclassify them as Tasks.
- Do not include empty fields.
- Keep tone professional and executive-friendly.
- Do not output long unbroken paragraphs — use the structured format below.
- If there are no due or overdue items, respond with: "There are no due or overdue items for today."`;

export const DAILY_SUMMARY_OUTPUT_FORMAT = `Daily Due and Overdue Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY
[Write a short paragraph covering: total items due today, total overdue, number of high-priority items, and any items that appear urgent or blocked. Example: "You have 8 open items requiring attention today: 5 due today and 3 overdue. Of these, 4 are high priority. The most urgent items appear to be [Title A], [Title B], and [Title C]."]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DUE TODAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks

[Task Title]
  Group: [Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

Follow-ups

[Follow-up Subject]
  Contact / Group: [Contact or Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERDUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks

[Task Title]
  Group: [Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]
  Days Overdue: [Number]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

Follow-ups

[Follow-up Subject]
  Contact / Group: [Contact or Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]
  Days Overdue: [Number]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH-PRIORITY ACTION ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Title] — [Task or Follow-up] — Due: [Date]
Action: [Recommended next step]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETED OR NO-ACTION ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Title] — Completed
Notes: [Short summary if relevant]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGGESTED DAILY ACTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Provide a short prioritized bullet list for the day based on what was found. Example:
• Address overdue high-priority items first.
• Follow up on any blocked or waiting items.
• Review due-today medium-priority items.
• Close or archive completed items if no further action is required.]`;
