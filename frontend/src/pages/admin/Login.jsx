import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/Button";
import { QrCode, Lock, User, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user?.is_staff ? "/admin" : "/scanner");
    } catch {
      setError("Invalid username or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden watermark-dark">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-glow mb-4">
            <QrCode className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">SWEP / SWIES</h1>
            <Sparkles className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Attendance Portal Console</p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-white/10 bg-white/95 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-display text-lg font-bold text-slate-900">Sign In to Dashboard</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Enter your staff or technologist credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Username</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full py-3.5 text-base shadow-glow mt-2">
              Sign In
            </Button>
          </form>

          {/* Quick Links Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
            <span className="text-slate-400 font-medium">Are you a student?</span>
            <div className="flex items-center justify-center gap-4">
              <Link to="/register" className="inline-flex items-center gap-1 font-bold text-teal-600 hover:text-teal-700 hover:underline">
                <span>Student Enrolment</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="text-slate-300">•</span>
              <Link to="/my-id" className="font-semibold text-slate-600 hover:text-slate-900 hover:underline">
                Recover Student Card
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
