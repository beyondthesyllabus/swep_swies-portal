import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { cacheRoster, getCachedRoster, queueScan, isAlreadyRecorded, getRecordedForSession, clearSessionData } from "../../offline/db";
import { trySync, startAutoSync } from "../../offline/sync";
import { QrCode, LogIn, LogOut, CheckCircle2, AlertTriangle, Search } from "lucide-react";

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
      <div className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-slate-900">Select Attendance Session</h1>
            <p className="mt-1 text-xs text-slate-500">Choose an active session to initialize scanning</p>
          </div>
          <Card className="border-slate-200 bg-white p-6 shadow-sm space-y-3">
            {sessions.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <QrCode className="mx-auto mb-2 h-10 w-10 stroke-1 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No open sessions found</p>
                <p className="mt-1 text-xs text-slate-400">Ask your administrator to initialize a session for your scope.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-teal-400 hover:bg-teal-50/40"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{s.activity_name}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{s.held_on} • {s.department_name}</p>
                    </div>
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
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
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-between bg-slate-50 px-4 py-6 text-slate-900">
      {/* Top control bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Live Session</span>
            <h2 className="font-display text-sm font-bold text-slate-900">{session.activity_name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs font-bold text-slate-700">
              {recordedCount} Scans
            </span>
            <button
              onClick={finishSession}
              className="rounded-xl border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              Finish
            </button>
          </div>
        </div>

        {/* Direction tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            onClick={() => setDirection("in")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors ${
              direction === "in"
                ? "bg-emerald-600 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>SIGN IN</span>
          </button>
          <button
            onClick={() => setDirection("out")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors ${
              direction === "out"
                ? "bg-amber-500 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LogOut className="h-4 w-4" />
            <span>SIGN OUT</span>
          </button>
        </div>

        {/* Camera viewfinder (dark by nature — it is the live feed) */}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-900 shadow-sm">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-8 flex flex-col items-center justify-between rounded-3xl border-2 border-dashed border-teal-400/70 p-4">
            <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-teal-300">
              Align Student QR Card
            </span>
            <div className="h-0.5 w-full animate-pulse bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
            <span className="font-mono text-[10px] text-slate-300">
              Direction: <span className="font-bold text-white uppercase">{direction}</span>
            </span>
          </div>
        </div>

        {/* Last result toast */}
        {lastResult && (
          <div className={`flex items-center gap-4 rounded-2xl border p-4 ${
            lastResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
          }`}>
            {lastResult.student?.photo ? (
              <img src={lastResult.student.photo} alt="" className="h-16 w-16 shrink-0 rounded-xl border-2 border-white object-cover shadow-sm" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-2xl font-bold text-slate-400">
                {lastResult.student?.name?.[0] || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {lastResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />}
                <p className="truncate text-sm font-bold">{lastResult.student?.name || "Scan Unrecognised"}</p>
              </div>
              {lastResult.student?.reg_no && (
                <p className="mt-0.5 font-mono text-xs text-teal-700">{lastResult.student.reg_no}</p>
              )}
              {lastResult.message && <p className="mt-1 text-xs text-slate-600">{lastResult.message}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Manual entry drawer */}
      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
        <Button
          variant="outline"
          onClick={() => setShowManual((v) => !v)}
          className="w-full py-3"
          icon={Search}
        >
          {showManual ? "Close Manual Entry" : "Manual Override Entry"}
        </Button>

        {showManual && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search by student name or reg. number…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-teal-500 focus:bg-white"
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition-colors hover:bg-slate-100">
      <button className="flex w-full items-center justify-between text-left text-xs font-bold text-slate-900" onClick={() => setPicking((v) => !v)}>
        <span>{student.name}</span>
        <span className="font-mono text-[11px] font-semibold text-teal-700">{student.reg_no}</span>
      </button>
      {picking && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
          {MANUAL_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => onPick(reason)}
              className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 transition-colors hover:bg-teal-600 hover:text-white"
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
