import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import useReferenceData from "../../api/useReferenceData";
import SelectorBar from "../../components/SelectorBar";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";
import { QrCode, ShieldCheck, LogOut, RefreshCw, CheckCircle2, Clock, Sparkles } from "lucide-react";

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
    <div className="watermark-dark relative flex min-h-screen flex-col justify-center overflow-hidden bg-slate-950 px-4 py-8">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto w-full max-w-md z-10 animate-fade-in space-y-6">
        {/* Technologist Bar */}
        <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 font-bold border border-teal-500/30">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Technologist Console</p>
              <p className="text-sm font-bold text-white">{user?.username}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {activeGrant ? (
          <Card className="glass-dark border-emerald-500/30 text-white shadow-2xl p-6 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-glow">
              <ShieldCheck className="h-9 w-9 stroke-[2.5]" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Scanning Authorized
              </span>
              <h2 className="font-display text-xl font-bold text-white">Active Access Grant</h2>
            </div>

            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-bold text-teal-300">{activeGrant.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cohort Level:</span>
                <span className="font-bold text-teal-300">{activeGrant.level_name}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Activity Module:</span>
                <span className="font-bold text-teal-300">{activeGrant.activity_name}</span>
              </div>
            </div>

            <Button className="w-full py-3.5 text-base shadow-glow" onClick={() => navigate("/scanner/session")}>
              Launch Attendance Scanner
            </Button>
          </Card>
        ) : (
          <Card className="bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-2xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Request Scanner Access</h2>
              <p className="text-xs text-slate-500 mt-1">Select your assigned session parameters to request administrator authorization.</p>
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
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors py-1"
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
