import { useEffect, useState, useCallback } from "react";
import client from "../../api/client";
import useReferenceData from "../../api/useReferenceData";
import SelectorBar from "../../components/SelectorBar";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { Clock, Plus, Lock, Calendar, CheckCircle2, Play, Sparkles } from "lucide-react";

export default function Sessions() {
  const { departments, levels, activities } = useReferenceData();
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [activity, setActivity] = useState("");
  const [heldOn, setHeldOn] = useState(new Date().toISOString().slice(0, 10));
  const [sessions, setSessions] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get("/attendance/sessions/");
      setSessions(data);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createSession() {
    if (!department || !level || !activity) return;
    setCreating(true);
    const now = new Date();
    const inOpens = now, inCloses = new Date(now.getTime() + 60 * 60 * 1000);
    const outOpens = new Date(now.getTime() + 3 * 60 * 60 * 1000), outCloses = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    try {
      await client.post("/attendance/sessions/", {
        department, level, activity, held_on: heldOn,
        sign_in_opens: inOpens.toISOString(), sign_in_closes: inCloses.toISOString(),
        sign_out_opens: outOpens.toISOString(), sign_out_closes: outCloses.toISOString(),
      });
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function closeSession(id) {
    await client.post(`/attendance/sessions/${id}/close/`);
    await load();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Session Management</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Initialize attendance scanning sessions, specify target departments, and close completed sessions to compute anomaly flags.
        </p>
      </div>

      {/* Selectors Bar */}
      <SelectorBar fields={[
        { label: "Level", value: level, onChange: setLevel, options: levels },
        { label: "Department", value: department, onChange: setDepartment, options: departments },
        { label: "Activity / Module", value: activity, onChange: setActivity, options: activities },
      ]} />

      {/* Create Session Card */}
      <Card title="Initialize New Session" icon={Plus} subtitle="Set session parameters to allow technologist scanning">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 space-y-1 w-full sm:w-auto">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-teal-600" />
              <span>Date Held</span>
            </label>
            <input
              type="date"
              value={heldOn}
              onChange={(e) => setHeldOn(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <Button onClick={createSession} loading={creating} disabled={!department || !level || !activity} icon={Play} className="w-full sm:w-auto py-2.5">
            Initialize Session
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Default sign-in window opens immediately for 1 hour. Sign-out opens +3 hours post creation. Exact schedule parameters are customizable per session.
        </p>
      </Card>

      {/* Sessions List Table */}
      <Card title="All Attendance Sessions" icon={Clock} subtitle={`${sessions.length} total sessions recorded`}>
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock className="mx-auto h-10 w-10 stroke-1 mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No sessions initialized yet</p>
            <p className="text-xs mt-0.5">Select a level, department, and activity above to start a session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Activity / Module</th>
                  <th className="py-3 px-4">Target Cohort</th>
                  <th className="py-3 px-4">Date Held</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.activity_name}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {s.department_name} • <span className="text-teal-700 font-mono">{s.level_name}L</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-500">{s.held_on}</td>
                    <td className="py-3.5 px-4">
                      {s.closed_at ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          <Lock className="h-3 w-3 text-slate-400" /> Closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60 shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active / Open
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!s.closed_at && (
                        <Button variant="outline" size="sm" onClick={() => closeSession(s.id)} icon={Lock}>
                          Close Session
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
