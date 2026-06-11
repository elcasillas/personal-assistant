"use client";

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";

const icons = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
  error:   <AlertCircle  className="w-4 h-4 text-red-500 shrink-0" />,
  info:    <Info         className="w-4 h-4 text-blue-500 shrink-0" />,
};

const borders = {
  success: "border-emerald-200 bg-emerald-50",
  error:   "border-red-200 bg-red-50",
  info:    "border-blue-200 bg-blue-50",
};

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-md text-sm text-slate-800 pointer-events-auto max-w-sm ${borders[toast.type]}`}
        >
          {icons[toast.type]}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
