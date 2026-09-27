import { useEffect, useState, useCallback } from "react";
import client from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { ShieldCheck, UserCheck, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

export default function AccessRequests() {
  const [requests, setRequests] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get("/core/access-grants/pending/");
      setRequests(data);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function grant(id) {
    await client.post(`/core/access-grants/${id}/grant/`);
    await load();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Technologist Access Requests</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Technologists request scanning authorization for specific cohort sessions. Access revokes automatically once the session is closed.
        </p>
      </div>

      <Card title={`Pending Authorization Requests (${requests.length})`} icon={ShieldAlert}>
        {requests.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="mx-auto h-12 w-12 stroke-1 mb-2 text-emerald-500" />
            <p className="text-base font-bold text-slate-700">All requests granted!</p>
            <p className="text-xs mt-0.5 text-slate-500">No pending technologist access requests awaiting authorization.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold text-lg border border-teal-100">
                    {req.operator_name?.[0]?.toUpperCase() || "T"}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">{req.operator_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {req.department_name} • <span className="font-bold text-slate-700">{req.level_name}L</span> • <span className="font-semibold text-teal-700">{req.activity_name}</span>
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => grant(req.id)} icon={ShieldCheck}>
                  Authorize Access
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
