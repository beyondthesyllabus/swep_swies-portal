import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import publicClient from "../../api/publicClient";
import Button from "../../components/Button";
import {
  GraduationCap, Mail, CheckCircle2, ShieldAlert, LogOut, RefreshCw,
  UserRound, CreditCard, ArrowRight, Copy,
} from "lucide-react";

const STEPS = { SIGNIN: "signin", CODE: "code", ACCOUNT: "account" };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

export default function StudentPortal() {
  const [step, setStep] = useState(
    sessionStorage.getItem("swep_student_session") ? STEPS.ACCOUNT : STEPS.SIGNIN
  );
  const [regNo, setRegNo] = useState("");
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState(null);
  const [newToken, setNewToken] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadProfile() {
    try {
      const { data } = await publicClient.get("/students/self-service/me/");
      setProfile(data);
      setStep(STEPS.ACCOUNT);
    } catch {
      sessionStorage.removeItem("swep_student_session");
      setStep(STEPS.SIGNIN);
    }
  }

  useEffect(() => {
    if (step === STEPS.ACCOUNT && !profile) loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function requestCode(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await publicClient.post("/students/self-service/request-code/", { reg_no: regNo });
      setMessage({ type: "success", text: data.message });
      setStep(STEPS.CODE);
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
      await loadProfile();
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
      setNewToken(data.raw_token);
      setMessage({ type: "success", text: data.message });
      loadProfile();
    } catch {
      setMessage({ type: "error", text: "Your session expired — please sign in again with a new code." });
      sessionStorage.removeItem("swep_student_session");
      setProfile(null);
      setStep(STEPS.SIGNIN);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem("swep_student_session");
    setProfile(null);
    setNewToken(null);
    setMessage(null);
    setCode("");
    setStep(STEPS.SIGNIN);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        {/* Brand header */}
        <header className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/faculty.png" alt="Institution crest" className="h-16 w-16 object-contain" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Student Portal
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              SWEP / SWIES &mdash; view your enrolment and manage your attendance card.
            </p>
          </div>
        </header>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-5">
          {/* Left: welcome / info panel */}
          <aside className="border-b border-slate-100 bg-gradient-to-br from-teal-50 via-emerald-50/60 to-white px-8 py-10 text-slate-700 lg:col-span-2 lg:border-b-0 lg:border-r">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="font-display mt-5 text-xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Sign in with your registration number and a one-time code sent to your
              registered email. No password is ever stored.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>View your enrolment record and status.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>Check your attendance card is active.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>Reissue a lost or damaged card instantly.</span>
              </li>
            </ul>
          </aside>

          {/* Right: form / account */}
          <section className="px-6 py-10 sm:px-10 lg:col-span-3">
            {step === STEPS.SIGNIN && (
              <form onSubmit={requestCode} className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">Student Sign In</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter your official registration number to receive a one-time code.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Registration Number
                  </label>
                  <input
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    required
                    placeholder="e.g. 22/EG/FE/630"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                {message && <Alert message={message} />}
                <Button type="submit" loading={loading} icon={Mail} className="w-full py-3">
                  Send One-Time Code
                </Button>
                <p className="text-center text-xs text-slate-500">
                  New student?{" "}
                  <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700 hover:underline">
                    Start your enrolment
                  </Link>
                </p>
              </form>
            )}

            {step === STEPS.CODE && (
              <form onSubmit={verifyCode} className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">Enter Verification Code</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    We sent a 6-digit code to your registered email for <span className="font-mono font-bold text-slate-700">{regNo}</span>.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    6-Digit Code
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                    placeholder="123456"
                    className={`${inputClass} text-center font-mono text-xl font-bold tracking-widest`}
                    autoFocus
                  />
                </div>
                {message && <Alert message={message} />}
                <Button type="submit" loading={loading} icon={CheckCircle2} className="w-full py-3">
                  Verify &amp; Sign In
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep(STEPS.SIGNIN); setMessage(null); }}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Use a different registration number
                </button>
              </form>
            )}

            {step === STEPS.ACCOUNT && profile && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      {profile.surname} {profile.first_name} {profile.other_names}
                    </h2>
                    <p className="mt-0.5 font-mono text-sm font-bold text-teal-700">{profile.reg_no}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Department" value={profile.department} />
                  <Field label="Level" value={profile.level} />
                  <Field label="Email" value={profile.email} />
                  <Field
                    label="Enrolment Status"
                    value={profile.status === "approved" ? "Approved" : profile.status}
                    accent={profile.status === "approved"}
                  />
                </dl>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Attendance Card</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {profile.card?.active
                          ? `Active since ${new Date(profile.card.issued_at).toLocaleDateString()}.`
                          : "No active card on record."}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${profile.card?.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {profile.card?.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {newToken && (
                    <div className="mt-4 rounded-xl border border-teal-200 bg-white p-4">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        New card token &mdash; save it now, it is shown only once
                      </span>
                      <div className="mt-1.5 flex items-center gap-2">
                        <code className="flex-1 break-all font-mono text-xs font-bold text-teal-700">{newToken}</code>
                        <button
                          onClick={() => navigator.clipboard?.writeText(newToken)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          title="Copy token"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <Button onClick={reissue} loading={loading} icon={RefreshCw} variant="outline" className="mt-4 w-full py-2.5">
                    I lost my card &mdash; reissue a new one
                  </Button>
                </div>

                {message && <Alert message={message} />}

                <p className="text-center text-xs text-slate-500">
                  Not enrolled yet?{" "}
                  <Link to="/register" className="inline-flex items-center gap-1 font-bold text-teal-600 hover:text-teal-700 hover:underline">
                    Start your enrolment <ArrowRight className="h-3 w-3" />
                  </Link>
                </p>
              </div>
            )}
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} SWEP / SWIES Attendance Portal
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold ${accent ? "text-emerald-700" : "text-slate-800"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

function Alert({ message }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
      {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
      <span>{message.text}</span>
    </div>
  );
}
