import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FileSpreadsheet,
  UserCheck,
  CreditCard,
  ShieldCheck,
  Clock,
  AlertTriangle,
  BarChart3,
  LogOut,
  QrCode,
  Sparkles,
} from "lucide-react";

const LINKS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/roster", label: "Class List", icon: FileSpreadsheet },
  { to: "/admin/registrations", label: "Registrations", icon: UserCheck },
  { to: "/admin/students", label: "Students & Cards", icon: CreditCard },
  { to: "/admin/access-requests", label: "Access Requests", icon: ShieldCheck },
  { to: "/admin/sessions", label: "Sessions", icon: Clock },
  { to: "/admin/flags", label: "Flag Review", icon: AlertTriangle },
  { to: "/admin/results", label: "Final Results", icon: BarChart3 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col justify-between bg-slate-900 text-slate-200 border-r border-slate-800 shadow-xl z-20 shrink-0">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-glow">
            <QrCode className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-bold text-white tracking-tight">SWEP / SWIES</span>
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-400/90">Admin Console</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 px-3.5 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navigation</p>
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/admin"}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-sm shadow-teal-900/50"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-teal-400"}`} />
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Info */}
      <div className="border-t border-slate-800/80 p-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 backdrop-blur-sm border border-slate-700/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
              {user?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-teal-400 font-medium">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
