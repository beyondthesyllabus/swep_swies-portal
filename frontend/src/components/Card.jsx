import React from "react";

export default function Card({ title, subtitle, icon: Icon, action, children, className = "", headerClassName = "", bodyClassName = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-panel transition-all duration-300 hover:shadow-md ${className}`}>
      {(title || subtitle || action) && (
        <header className={`flex items-center justify-between border-b border-slate-100 px-6 py-4.5 ${headerClassName}`}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                <Icon className="h-4.5 w-4.5 stroke-[2]" />
              </div>
            )}
            <div>
              {title && <h2 className="font-display text-base font-bold text-slate-900 tracking-tight">{title}</h2>}
              {subtitle && <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
