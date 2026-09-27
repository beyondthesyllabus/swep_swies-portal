import React from "react";
import Select from "./Select";

export default function SelectorBar({ fields }) {
  return (
    <div className="flex flex-wrap items-center rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-1.5 shadow-panel divide-x divide-slate-100">
      {fields.map((field) => (
        <Select key={field.label} {...field} />
      ))}
    </div>
  );
}
