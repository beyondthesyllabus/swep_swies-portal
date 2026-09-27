import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import Card from "../../components/Card";
import {
  UserCheck,
  Users,
  ShieldCheck,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Printer,
  AlertTriangle,
  Award,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({ pending: 0, students: 0, accessRequests: 0, activeSessions: 0 });

  useEffect(() => {
    client.get("/students/registrations/pending/").then((r) => setStats((s) => ({ ...s, pending: r.data.length }))).catch(() => {});
    client.get("/students/students/").then((r) => setStats((s) => ({ ...s, students: r.data.length }))).catch(() => {});
    client.get("/core/access-grants/pending/").then((r) => setStats((s) => ({ ...s, accessRequests: r.data.length }))).catch(() => {});
    client.get("/attendance/sessions/").then((r) => setStats((s) => ({ ...s, activeSessions: r.data.filter((x) => x.is_active).length }))).catch(() => {});
  }, []);

  const WORKFLOW_STEPS = [
    { title: "Upload Class Roster", desc: "Load official student list for automated matching", link: "/admin/roster", icon: FileSpreadsheet, color: "text-blue-600 bg-blue-50 border-blue-100" },
    { title: "Approve Registrations", desc: "Review student photo enrolment submissions", link: "/admin/registrations", icon: UserCheck, color: "text-teal-600 bg-teal-50 border-teal-100" },
    { title: "Issue & Print Cards", desc: "Generate printable card sheets with QR codes", link: "/admin/students", icon: Printer, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { title: "Grant Technologist Access", desc: "Authorize scanning devices for attendance sessions", link: "/admin/access-requests", icon: ShieldCheck, color: "text-amber-600 bg-amber-50 border-amber-100" },
    { title: "Monitor Sessions & Flags", desc: "Track live scans and review automated anomaly flags", link: "/admin/flags", icon: AlertTriangle, color: "text-rose-600 bg-rose-50 border-rose-100" },
    { title: "Export Final Results", desc: "Generate final attendance registers in PDF or Excel", link: "/admin/results", icon: Award, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top banner header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-teal-50/40 to-emerald-50/30 p-8 shadow-sm">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SWEP / SWIES (I & II) Portal</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">System Control Center</h1>
            <p className="mt-1 text-sm text-slate-500">
              Active Session Period: <span className="font-bold text-teal-700">28 September – 22 October</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/sessions"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700"
            >
              <Clock className="h-4 w-4" />
              <span>Manage Sessions</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Registrations</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display text-3xl font-extrabold text-slate-900">{stats.pending}</span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Awaiting Review</span>
          </div>
        </Card>

        <Card className="hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved Students</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display text-3xl font-extrabold text-slate-900">{stats.students}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Enrolled</span>
          </div>
        </Card>

        <Card className="hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Access Requests</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display text-3xl font-extrabold text-slate-900">{stats.accessRequests}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Technologists</span>
          </div>
        </Card>

        <Card className="hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Active Sessions</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display text-3xl font-extrabold text-slate-900">{stats.activeSessions}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" /> Live Now
            </span>
          </div>
        </Card>
      </div>

      {/* Interactive Operational Workflow */}
      <Card title="Portal Operational Workflow" subtitle="Follow these steps to manage the complete attendance lifecycle">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                to={step.link}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 hover:bg-white hover:border-teal-500/40 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${step.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-teal-600 transition-colors">
                      0{idx + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
                  <span>Open Section</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
