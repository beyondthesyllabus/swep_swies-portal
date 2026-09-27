import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";

import Login from "./pages/admin/Login";
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

import Register from "./pages/student/Register";
import SelfService from "./pages/student/SelfService";

function AdminLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_staff) return <Navigate to="/scanner" replace />;
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />
      <main className="watermark-light min-h-screen flex-1 overflow-y-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] px-8 py-8 [background-size:24px_24px]">
        <div className="relative z-10 mx-auto max-w-7xl animate-fade-in">{children}</div>
      </main>
    </div>
  );
}

function ScannerLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/my-id" element={<SelfService />} />

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

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
