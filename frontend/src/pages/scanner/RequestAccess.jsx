import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import useReferenceData from "../../api/useReferenceData";
import SelectorBar from "../../components/SelectorBar";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";
import { QrCode, ShieldCheck, LogOut, RefreshCw } from "lucide-react";

export default function RequestAccess() {
  const { user, logout } = useAuth();
  const { departments, levels, activities } = useReferenceData();
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [activity, setActivity] = useState("");
  const [activeGrant, setActiveGrant] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  async function checkActive() {
    setChecking(true);
    try {
      const { data } = await client.get("/core/access-grants/my_active/");
      setActiveGrant(data);
    } catch (e) {
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { checkActive(); }, []);

  async function requestAccess() {
    if (!department || !level || !activity) return;
    setRequesting(true);
    try {
      await client.post("/core/access-grants/", { department, level, activity });
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Technologist bar */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Technologist Console</p>
              <p className="text-sm font-bold text-slate-900">{user?.username}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {activeGrant ? (
          <Card className="border-slate-200 bg-white p-6 text-center shadow-sm space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-9 w-9 stroke-[2.2]" />
            </div>
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Scanning Authorized
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900">Active Access Grant</h2>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-bold text-teal-700">{activeGrant.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cohort Level:</span>
                <span className="font-bold text-teal-700">{activeGrant.level_name}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Activity Module:</span>
                <span className="font-bold text-teal-700">{activeGrant.activity_name}</span>
              </div>
            </div>

            <Button className="w-full py-3.5 text-base" onClick={() => navigate("/scanner/session")}>
              Launch Attendance Scanner
            </Button>
          </Card>
        ) : (
          <Card className="border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Request Scanner Access</h2>
              <p className="mt-1 text-xs text-slate-500">Select your assigned session parameters to request administrator authorization.</p>
            </div>

            <SelectorBar fields={[
              { label: "Level", value: level, onChange: setLevel, options: levels },
              { label: "Department", value: department, onChange: setDepartment, options: departments },
              { label: "Activity / Module", value: activity, onChange: setActivity, options: activities },
            ]} />

            <Button onClick={requestAccess} loading={requesting} disabled={!department || !level || !activity} className="w-full py-3">
              Request Authorization
            </Button>

            <button
              onClick={checkActive}
              disabled={checking}
              className="inline-flex w-full items-center justify-center gap-1.5 py-1 text-xs font-bold text-teal-600 transition-colors hover:text-teal-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>Check Authorization Status</span>
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
