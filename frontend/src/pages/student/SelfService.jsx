import { useState } from "react";
import { Link } from "react-router-dom";
import publicClient from "../../api/publicClient";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { KeyRound, Mail, CheckCircle2, ShieldAlert, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";

const STEPS = { REQUEST: "request", VERIFY: "verify", READY: "ready", ISSUED: "issued" };

export default function SelfService() {
  const [step, setStep] = useState(STEPS.REQUEST);
  const [regNo, setRegNo] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState(null);

  async function requestCode(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await publicClient.post("/students/self-service/request-code/", { reg_no: regNo });
      setMessage({ type: "success", text: data.message });
      setStep(STEPS.VERIFY);
    } catch {
      setMessage({ type: "error", text: "Invalid registration number or student not found." });
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await publicClient.post("/students/self-service/verify-code/", { reg_no: regNo, code });
      sessionStorage.setItem("swep_student_session", data.session_token);
      setStep(STEPS.READY);
    } catch {
      setMessage({ type: "error", text: "Invalid or expired verification code." });
    } finally {
      setLoading(false);
    }
  }

  async function reissue() {
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await publicClient.post("/students/self-service/reissue-card/");
      setNewToken(data);
      setStep(STEPS.ISSUED);
    } catch {
      setMessage({ type: "error", text: "Your session expired — please request a new verification code." });
      setStep(STEPS.REQUEST);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="watermark-dark relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* Ambient background blur */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-glow mb-4">
            <KeyRound className="h-7 w-7 stroke-[2.2]" />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">Student ID Recovery</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-teal-400">Card Self-Service Portal</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-5">
          {step === STEPS.REQUEST && (
            <form onSubmit={requestCode} className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-base font-bold text-slate-900">Step 1: Request Security Code</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your official registration number. A 6-digit verification code will be dispatched to your registered email address.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Registration Number</label>
                <input
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  required
                  placeholder="e.g. ENG/2021/001"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                />
              </div>

              <Button type="submit" loading={loading} icon={Mail} className="w-full py-3">
                Send One-Time Code
              </Button>
            </form>
          )}

          {step === STEPS.VERIFY && (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-base font-bold text-slate-900">Step 2: Enter Verification Code</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We sent a 6-digit code to your email. Enter it below to verify your identity.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">6-Digit Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                  placeholder="123456"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-center font-mono text-xl font-bold tracking-widest text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                />
              </div>

              <Button type="submit" loading={loading} icon={CheckCircle2} className="w-full py-3">
                Verify Code
              </Button>
            </form>
          )}

          {step === STEPS.READY && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">Identity Verified</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Reissuing deactivates your previous attendance card token immediately and generates a fresh active token.
                </p>
              </div>

              <Button onClick={reissue} loading={loading} icon={RefreshCw} className="w-full py-3 shadow-glow">
                Reissue Card &amp; Revoke Lost Token
              </Button>
            </div>
          )}

          {step === STEPS.ISSUED && newToken && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">New Card Token Issued</h2>
                <p className="text-xs text-emerald-600 font-semibold mt-1">Your previous card token has been revoked.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">New Security Token</span>
                <p className="font-mono text-xs text-teal-400 break-all">{newToken.raw_token}</p>
              </div>

              <p className="text-xs text-slate-400">A printable PDF copy of your new card token has also been sent to your email.</p>
            </div>
          )}

          {message && (
            <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
              {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Portal Login</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
