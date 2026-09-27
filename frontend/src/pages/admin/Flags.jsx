import { useEffect, useState, useCallback } from "react";
import client from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock, User, FileText } from "lucide-react";

const KIND_LABELS = {
  burst: "Card Bursting — Multiple scans in seconds",
  missing_out: "Signed In, Never Signed Out",
  orphan_out: "Signed Out without Sign In",
  short_dwell: "Suspiciously Short Stay Duration",
  out_of_window: "Scanned Outside Declared Window",
  clock_skew: "Device Clock Skew Detected",
  manual_heavy: "High Manual Overrides Ratio",
};

export default function Flags() {
  const [flags, setFlags] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolution, setResolution] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await client.get("/attendance/flags/", { params: { unresolved: "true" } });
      setFlags(data);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(id) {
    await client.post(`/attendance/flags/${id}/resolve/`, { resolution });
    setResolvingId(null);
    setResolution("");
    await load();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Attendance Anomaly Flags</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Automated rule checks surface potential attendance anomalies for administrator review before finalizing registers.
        </p>
      </div>

      <Card title={`Unresolved Flags (${flags.length})`} icon={ShieldAlert}>
        {flags.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="mx-auto h-12 w-12 stroke-1 mb-2 text-emerald-500" />
            <p className="text-base font-bold text-slate-700">All flags reviewed!</p>
            <p className="text-xs mt-0.5 text-slate-500">No unresolved attendance anomaly flags in the queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/30 space-y-3 transition-all hover:bg-amber-50/60"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300/50">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      {KIND_LABELS[flag.kind] || flag.kind}
                    </span>
                    {flag.full_name && (
                      <span className="font-semibold text-slate-900 text-sm">
                        {flag.full_name} <span className="font-mono text-xs text-teal-700">({flag.reg_no})</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(flag.raised_at).toLocaleString()}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
                  {JSON.stringify(flag.detail, null, 2)}
                </div>

                {resolvingId === flag.id ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      autoFocus
                      placeholder="Enter resolution notes / decision rationale…"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                    <Button size="sm" onClick={() => resolve(flag.id)} icon={CheckCircle2}>
                      Save Resolution
                    </Button>
                    <button className="text-xs font-semibold text-slate-500 hover:underline px-2" onClick={() => setResolvingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => setResolvingId(flag.id)} icon={CheckCircle2}>
                      Resolve Flag
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
