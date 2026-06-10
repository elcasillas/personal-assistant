"use client";
import { useState, useRef } from "react";
import { cn } from "@/lib/todo-utils";

interface FollowUpUpdateComposerProps {
  onSubmit: (content: string) => void;
}

export function FollowUpUpdateComposer({ onSubmit }: FollowUpUpdateComposerProps) {
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
    textareaRef.current?.focus();
  };

  return (
    <div className="p-3 border-b border-slate-100 flex-shrink-0">
      <div className={cn("rounded-xl border bg-white transition-shadow", focused ? "border-blue-400 shadow-sm ring-2 ring-blue-500/10" : "border-slate-200")}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); } }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Write an update…"
          rows={3}
          className="w-full px-3 pt-3 pb-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-none outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          <span className="text-[11px] text-slate-400 select-none">⌘ + Enter to post</span>
          <button onClick={handleSubmit} disabled={!content.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
