import type { HTMLAttributes, ReactNode } from "react";

export function Panel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-gray-100 bg-white shadow-sm ${className}`} {...props} />;
}

export function SectionHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

export function StatusPill({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  const toneClass = {
    neutral: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-indigo-100 text-indigo-700",
  }[tone];

  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${toneClass}`}>{children}</span>;
}
