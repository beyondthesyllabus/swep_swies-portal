import React from "react";

const STYLES = {
  present: { label: "Present", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dot: "bg-emerald-500" },
  absent: { label: "Absent", bg: "bg-rose-50 text-rose-700 border-rose-200/60", dot: "bg-rose-500" },
  matched: { label: "Matches Roster", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dot: "bg-emerald-500" },
  needs_review: { label: "Needs Review", bg: "bg-amber-50 text-amber-700 border-amber-200/60", dot: "bg-amber-500" },
  pending: { label: "Pending", bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  approved: { label: "Approved", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", bg: "bg-rose-50 text-rose-700 border-rose-200/60", dot: "bg-rose-500" },
};

export default function StatusPill({ kind }) {
  const style = STYLES[kind] ?? STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
