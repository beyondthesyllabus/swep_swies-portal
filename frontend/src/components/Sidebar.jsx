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
    <aside className="sticky top-0 z-20 flex h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white text-slate-700">
      <div>
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <QrCode className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-display block text-lg font-bold tracking-tight text-slate-900">SWEP / SWIES</span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">Admin Console</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3.5 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation</p>
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/admin"}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-teal-600" : "text-slate-400 group-hover:text-teal-600"}`} />
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / user */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 font-bold text-white">
              {user?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="truncate">
              <p className="truncate text-xs font-bold text-slate-900">{user?.username}</p>
              <p className="text-[10px] font-medium text-teal-600">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
