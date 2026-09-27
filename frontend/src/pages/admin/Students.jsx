import { useEffect, useState, useCallback } from "react";
import client from "../../api/client";
import useReferenceData from "../../api/useReferenceData";
import SelectorBar from "../../components/SelectorBar";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { CreditCard, Printer, RefreshCw, Search, CheckCircle2, UserCheck, Shield } from "lucide-react";

export default function Students() {
  const { departments, levels } = useReferenceData();
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [students, setStudents] = useState([]);
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!department || !level) return;
    try {
      const { data } = await client.get("/students/students/", { params: { department, level } });
      setStudents(data);
    } catch (e) {}
  }, [department, level]);

  useEffect(() => { load(); }, [load]);

  async function printSheet() {
    setPrinting(true);
    try {
      const response = await client.get("/students/cards/print-sheet/", {
        params: { department, level }, responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url; link.download = `card_sheet_${department}_${level}L.pdf`; link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setPrinting(false);
    }
  }

  async function reissue(studentId) {
    await client.post(`/students/students/${studentId}/issue-card/`);
    await load();
  }

  const filtered = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.reg_no?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Enrolled Students &amp; Cards</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          View approved students, reissue digital card security tokens, and export printable card sheets with QR barcodes.
        </p>
      </div>

      {/* Selectors Bar */}
      <SelectorBar fields={[
        { label: "Level", value: level, onChange: setLevel, options: levels },
        { label: "Department", value: department, onChange: setDepartment, options: departments },
      ]} />

      {department && level && (
        <Card
          title={`Enrolled Students (${filtered.length})`}
          icon={UserCheck}
          subtitle={`Showing students for selected cohort`}
          action={
            <Button onClick={printSheet} loading={printing} disabled={students.length === 0} icon={Printer}>
              Export Printable PDF Sheet
            </Button>
          }
        >
          {/* Search bar */}
          <div className="mb-4 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or reg number…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CreditCard className="mx-auto h-10 w-10 stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No approved students found</p>
              <p className="text-xs mt-0.5">Approved registrations for this cohort will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-xl">Reg. Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Card Security Token</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.reg_no}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{s.full_name}</td>
                      <td className="py-3.5 px-4">
                        {s.has_active_card ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                            <Shield className="h-3 w-3 text-emerald-500" /> Active Card
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            No Active Token
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => reissue(s.id)} icon={RefreshCw}>
                          Reissue Card
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
