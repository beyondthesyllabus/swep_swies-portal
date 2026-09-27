import React from "react";
import { ChevronDown } from "lucide-react";

export default function Select({ label, value, onChange, options, placeholder = "Select option…", className = "" }) {
  return (
    <div className={`relative flex min-w-[190px] flex-1 flex-col px-4 py-2.5 ${className}`}>
      {label && <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</span>}
      <div className="relative flex items-center">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent pr-7 font-sans text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:text-teal-700"
        >
          <option value="" disabled className="text-slate-400 font-normal">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-800 font-medium py-1">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
}
