import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { cacheRoster, getCachedRoster, queueScan, isAlreadyRecorded, getRecordedForSession, clearSessionData } from "../../offline/db";
import { trySync, startAutoSync } from "../../offline/sync";
import { QrCode, LogIn, LogOut, CheckCircle2, AlertTriangle, Search, UserCheck, ShieldAlert, X } from "lucide-react";

const DEBOUNCE_MS = 2500;
const MANUAL_REASONS = ["Card forgotten", "Card damaged", "Card lost", "Camera failure", "Other"];

function getDeviceId() {
  let id = localStorage.getItem("swep_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("swep_device_id", id);
  }
  return id;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ScanScreen() {
  const navigate = useNavigate();
  const [activeGrant, setActiveGrant] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [roster, setRoster] = useState(null);
  const [direction, setDirection] = useState("in");
  const [lastResult, setLastResult] = useState(null); // {student, ok}
  const [manualQuery, setManualQuery] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);

  const videoRef = useRef(null);
  const seenRef = useRef(new Map());
  const decodeIntervalRef = useRef(null);
  const detectorRef = useRef(null);

  // --- Load active grant + matching open sessions ---
  useEffect(() => {
    (async () => {
      try {
        const { data: grant } = await client.get("/core/access-grants/my_active/");
        if (!grant) { navigate("/scanner"); return; }
        setActiveGrant(grant);
        const { data: allSessions } = await client.get("/attendance/sessions/", {
          params: { department: grant.department, level: grant.level, activity: grant.activity },
        });
        setSessions(allSessions.filter((s) => !s.closed_at));
      } catch (e) {
        navigate("/scanner");
      }
    })();
  }, [navigate]);

  // --- Once a session is picked, prefetch/cache the roster ---
  const selectSession = useCallback(async (s) => {
    setSession(s);
    let payload;
    try {
      const { data } = await client.get(`/attendance/sessions/${s.id}/roster/`);
      await cacheRoster(data);
      payload = data;
    } catch {
      payload = await getCachedRoster(s.id);
    }
    setRoster(payload);
    const recorded = await getRecordedForSession();
    setRecordedCount(recorded.length);
  }, []);

  // --- Camera decode loop ---
  useEffect(() => {
    if (!session || !roster) return;

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) videoRef.current.srcObject = stream;

        if ("BarcodeDetector" in window) {
          detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
          decodeIntervalRef.current = setInterval(async () => {
            if (!videoRef.current) return;
            try {
              const codes = await detectorRef.current.detect(videoRef.current);
              if (codes.length > 0) await onDecode(codes[0].rawValue);
            } catch { }
          }, 400);
        }
      } catch (err) {}
    })();

    const stopSync = startAutoSync();
    return () => {
      cancelled = true;
      clearInterval(decodeIntervalRef.current);
      stopSync();
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, [session, roster, direction]);

  async function onDecode(rawValue) {
    const hash = await sha256Hex(rawValue);
    const last = seenRef.current.get(hash);
    if (last && Date.now() - last < DEBOUNCE_MS) return;
    seenRef.current.set(hash, Date.now());

    const student = roster.students.find((s) => s.token_sha256 === hash);
    if (!student) {
      setLastResult({ ok: false, message: "Card token not recognised for this cohort session." });
      return;
    }
    await recordScan(student, "scan");
  }

  async function recordScan(student, source, manualReason = "") {
    if (await isAlreadyRecorded(student.student_id, direction)) {
      setLastResult({ ok: false, student, message: `${student.name} already signed ${direction.toUpperCase()} for this session.` });
      return;
    }

    const scan = {
      client_uuid: crypto.randomUUID(),
      session_id: session.id,
      student_id: student.student_id,
      direction,
      source,
      manual_reason: manualReason,
      scanned_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await queueScan(scan);
    setRecordedCount((c) => c + 1);
    setLastResult({ ok: true, student, message: null });
    trySync();
  }

  function finishSession() {
    clearSessionData();
    navigate("/scanner");
  }

  const manualMatches = roster && manualQuery.length > 1
    ? roster.students.filter((s) =>
        s.name.toLowerCase().includes(manualQuery.toLowerCase()) || s.reg_no.toLowerCase().includes(manualQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  if (!activeGrant) return null;

  if (!session) {
    return (
      <div className="watermark-dark relative flex min-h-screen flex-col justify-center overflow-hidden bg-slate-950 px-4 py-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto w-full max-w-md z-10 animate-fade-in space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-white">Select Attendance Session</h1>
            <p className="text-xs text-slate-400 mt-1">Choose an active session to initialize scanning</p>
          </div>
          <Card className="glass-dark border-slate-800 text-white p-6 space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <QrCode className="mx-auto h-10 w-10 stroke-1 mb-2 text-slate-500" />
                <p className="text-sm font-semibold">No open sessions found</p>
                <p className="text-xs text-slate-500 mt-1">Ask your administrator to initialize a session for your scope.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 hover:border-teal-500/50 transition-all text-left"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{s.activity_name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{s.held_on} • {s.department_name}</p>
                    </div>
                    <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                      Start Scanning
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="watermark-dark relative mx-auto flex min-h-screen max-w-lg flex-col justify-between bg-slate-950 px-4 py-6 text-white">
      {/* Top Toggle & Control Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Live Session HUD</span>
            <h2 className="font-display text-sm font-bold text-white">{session.activity_name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
              {recordedCount} Scans
            </span>
            <button
              onClick={finishSession}
              className="text-xs font-semibold text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded-xl transition-colors border border-rose-500/20"
            >
              Finish
            </button>
          </div>
        </div>

        {/* Direction Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setDirection("in")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              direction === "in"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>SIGN IN</span>
          </button>
          <button
            onClick={() => setDirection("out")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              direction === "out"
                ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-glow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <LogOut className="h-4 w-4" />
            <span>SIGN OUT</span>
          </button>
        </div>

        {/* Camera Reticle Viewfinder */}
        <div className="relative overflow-hidden rounded-3xl bg-black border-2 border-slate-800 aspect-square shadow-2xl flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          {/* HUD Target Overlay */}
          <div className="pointer-events-none absolute inset-8 border-2 border-dashed border-teal-400/60 rounded-3xl flex flex-col items-center justify-between p-4">
            <span className="text-[10px] font-bold tracking-widest text-teal-300 uppercase bg-slate-950/80 px-3 py-1 rounded-full border border-teal-500/30">
              Align Student QR Card
            </span>
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400">
              Direction: <span className="font-bold text-white uppercase">{direction}</span>
            </span>
          </div>
        </div>

        {/* Last Result Toast Card */}
        {lastResult && (
          <div className={`p-4 rounded-2xl border flex items-center gap-4 animate-slide-up ${
            lastResult.ok ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100" : "bg-rose-950/90 border-rose-500/40 text-rose-100"
          }`}>
            {lastResult.student?.photo ? (
              <img src={lastResult.student.photo} alt="" className="h-16 w-16 rounded-xl object-cover border-2 border-white/20 shadow-md shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-2xl text-slate-400 shrink-0">
                {lastResult.student?.name?.[0] || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {lastResult.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />}
                <p className="font-bold text-sm truncate">{lastResult.student?.name || "Scan Unrecognised"}</p>
              </div>
              {lastResult.student?.reg_no && (
                <p className="font-mono text-xs text-teal-300 mt-0.5">{lastResult.student.reg_no}</p>
              )}
              {lastResult.message && <p className="text-xs text-slate-300 mt-1">{lastResult.message}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Drawer */}
      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
        <Button
          variant="outline"
          onClick={() => setShowManual((v) => !v)}
          className="w-full py-3 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900"
          icon={Search}
        >
          {showManual ? "Close Manual Entry" : "Manual Override Entry"}
        </Button>

        {showManual && (
          <div className="rounded-2xl bg-white p-4 text-slate-900 space-y-3 shadow-2xl animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search by student name or reg. number…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm font-semibold outline-none focus:border-teal-500"
              />
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {manualMatches.map((s) => (
                <ManualRow key={s.student_id} student={s} onPick={(reason) => recordScan(s, "manual", reason)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualRow({ student, onPick }) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/60 hover:bg-slate-100 transition-colors">
      <button className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-900" onClick={() => setPicking((v) => !v)}>
        <span>{student.name}</span>
        <span className="font-mono text-[11px] text-teal-700 font-semibold">{student.reg_no}</span>
      </button>
      {picking && (
        <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
          {MANUAL_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => onPick(reason)}
              className="rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-600 hover:text-white transition-all"
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
