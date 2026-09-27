import React from "react";

const VARIANTS = {
  primary: "bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all duration-200 active:scale-[0.98]",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-sm transition-all duration-200 active:scale-[0.98]",
  ghost: "bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-all duration-200 active:scale-[0.98]",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]",
  danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all duration-200 active:scale-[0.98]",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2 font-semibold",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5 font-semibold",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  children,
  className = "",
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-sans transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0 stroke-[2.2]" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
