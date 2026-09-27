import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";

import ConsoleLogin from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import RosterReference from "./pages/admin/RosterReference";
import Registrations from "./pages/admin/Registrations";
import Students from "./pages/admin/Students";
import AccessRequests from "./pages/admin/AccessRequests";
import Sessions from "./pages/admin/Sessions";
import Flags from "./pages/admin/Flags";
import FinalResults from "./pages/admin/FinalResults";

import RequestAccess from "./pages/scanner/RequestAccess";
import ScanScreen from "./pages/scanner/ScanScreen";

import StudentPortal from "./pages/student/StudentPortal";
import Register from "./pages/student/Register";

function AdminLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/console" replace />;
  if (!user.is_staff) return <Navigate to="/scanner" replace />;
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-y-auto bg-slate-50 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
      </main>
    </div>
  );
}

function ScannerLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/console" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ---- Student-facing (public). Never references staff surfaces. ---- */}
      <Route path="/" element={<StudentPortal />} />
      <Route path="/register" element={<Register />} />
      {/* Legacy student entry points fold into the student portal. */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/my-id" element={<Navigate to="/" replace />} />

      {/* ---- Staff console (admin + technologist). Not linked from any student page. ---- */}
      <Route path="/console" element={<ConsoleLogin />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
      <Route path="/admin/roster" element={<AdminLayout><RosterReference /></AdminLayout>} />
      <Route path="/admin/registrations" element={<AdminLayout><Registrations /></AdminLayout>} />
      <Route path="/admin/students" element={<AdminLayout><Students /></AdminLayout>} />
      <Route path="/admin/access-requests" element={<AdminLayout><AccessRequests /></AdminLayout>} />
      <Route path="/admin/sessions" element={<AdminLayout><Sessions /></AdminLayout>} />
      <Route path="/admin/flags" element={<AdminLayout><Flags /></AdminLayout>} />
      <Route path="/admin/results" element={<AdminLayout><FinalResults /></AdminLayout>} />

      {/* Scanner (technologist) */}
      <Route path="/scanner" element={<ScannerLayout><RequestAccess /></ScannerLayout>} />
      <Route path="/scanner/session" element={<ScannerLayout><ScanScreen /></ScannerLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
