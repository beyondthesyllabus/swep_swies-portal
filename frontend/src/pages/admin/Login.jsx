import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/Button";
import { QrCode, Lock, User, ShieldAlert } from "lucide-react";

export default function ConsoleLogin() {
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

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
            <QrCode className="h-7 w-7 stroke-[2.2]" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Staff Console
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Authorised personnel only
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-display text-lg font-bold text-slate-900">Sign in</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Enter your staff or technologist credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Username</label>
              <div className="relative flex items-center">
                <User className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className={inputClass}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative flex items-center">
                <Lock className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="mt-2 w-full py-3.5 text-base">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
