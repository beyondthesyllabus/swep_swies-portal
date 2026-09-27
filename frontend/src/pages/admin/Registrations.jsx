import { useEffect, useState, useCallback } from "react";
import client from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import { UserCheck, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, UserX, Search } from "lucide-react";

export default function Registrations() {
  const [pending, setPending] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const { data } = await client.get("/students/registrations/pending/");
      data.sort((a, b) => Number(b.roster_matched) - Number(a.roster_matched));
      setPending(data);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id) {
    await client.post(`/students/registrations/${id}/approve/`);
    await load();
  }

  async function reject(id) {
    await client.post(`/students/registrations/${id}/reject/`, { reason });
    setRejectingId(null);
    setReason("");
    await load();
  }

  const filtered = pending.filter((reg) => {
    if (filter === "matched") return reg.roster_matched;
    if (filter === "review") return !reg.roster_matched;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-teal-600" />
            <h1 className="font-display text-2xl font-bold text-slate-900">Student Registration Queue</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Review student enrolment applications, verify captured photos against class rosters, and issue cards.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            All ({pending.length})
          </button>
          <button
            onClick={() => setFilter("matched")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === "matched" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Matched ({pending.filter(x => x.roster_matched).length})
          </button>
          <button
            onClick={() => setFilter("review")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === "review" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Needs Review ({pending.filter(x => !x.roster_matched).length})
          </button>
        </div>
      </div>

      {/* Main Container */}
      <Card title={`Pending Applications (${filtered.length})`} icon={UserCheck}>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="mx-auto h-12 w-12 stroke-1 mb-2 text-emerald-500" />
            <p className="text-base font-bold text-slate-700">Queue is completely clear!</p>
            <p className="text-xs mt-0.5 text-slate-500">No pending student registration submissions awaiting approval.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((reg) => (
              <div
                key={reg.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  {reg.photo ? (
                    <img src={reg.photo} alt={reg.full_name} className="h-16 w-16 rounded-xl object-cover border-2 border-teal-500/30 shadow-sm" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-xl">
                      {reg.full_name?.[0]}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-bold text-slate-900">{reg.full_name}</h3>
                      <StatusPill kind={reg.roster_matched ? "matched" : "needs_review"} />
                    </div>
                    <p className="font-mono text-xs font-semibold text-teal-700 mt-0.5">{reg.reg_no}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {reg.department_name} • <span className="font-bold text-slate-700">{reg.level_name}L</span> • {reg.email}
                    </p>
                  </div>
                </div>

                {rejectingId === reg.id ? (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <input
                      autoFocus
                      placeholder="Reason for rejection…"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    <Button variant="danger" size="sm" onClick={() => reject(reg.id)} icon={UserX}>
                      Confirm Reject
                    </Button>
                    <button className="text-xs font-semibold text-slate-500 hover:underline px-2" onClick={() => setRejectingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setRejectingId(reg.id)} icon={XCircle}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => approve(reg.id)} icon={CheckCircle2}>
                      Approve &amp; Issue Card
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
