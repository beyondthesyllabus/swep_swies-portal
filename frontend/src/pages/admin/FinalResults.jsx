import { useState } from "react";
import client from "../../api/client";
import useReferenceData from "../../api/useReferenceData";
import SelectorBar from "../../components/SelectorBar";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { BarChart3, FileText, Download, Award, Search, CheckCircle2 } from "lucide-react";

export default function FinalResults() {
  const { departments, levels } = useReferenceData();
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");

  async function view() {
    if (!department || !level) return;
    setLoading(true);
    try {
      const { data } = await client.get("/attendance/final-results/", { params: { department, level } });
      setResults(data.results);
    } finally {
      setLoading(false);
    }
  }

  async function exportAs(fmt) {
    setExporting(true);
    try {
      const response = await client.get("/attendance/final-results/export/", {
        params: { department, level, format: fmt }, responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url; link.download = fmt === "excel" ? "final_results.xlsx" : "final_results.pdf"; link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const filtered = results ? results.filter(
    (r) =>
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.reg_no?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Final Attendance Register &amp; Grading</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Compute attendance frequencies, calculated scores, and export official PDF or Excel registers.
        </p>
      </div>

      {/* Selectors Bar */}
      <SelectorBar fields={[
        { label: "Level", value: level, onChange: setLevel, options: levels },
        { label: "Department", value: department, onChange: setDepartment, options: departments },
      ]} />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={view} loading={loading} disabled={!department || !level} icon={BarChart3} className="py-2.5">
          Generate Final Result Matrix
        </Button>
        {results && (
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={() => exportAs("pdf")} loading={exporting} icon={FileText} className="py-2.5">
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => exportAs("excel")} loading={exporting} icon={Download} className="py-2.5">
              Export Excel (.xlsx)
            </Button>
          </div>
        )}
      </div>

      {results && (
        <Card title={`Attendance Summary (${filtered.length} Students)`} icon={Award}>
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
              <BarChart3 className="mx-auto h-10 w-10 stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No results found</p>
              <p className="text-xs mt-0.5">Adjust department/level selections or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-xl">Reg. Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Sessions Attended</th>
                    <th className="py-3 px-4">Attendance Frequency</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => {
                    const freq = parseFloat(r.frequency_percentage) || 0;
                    return (
                      <tr key={r.student_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.reg_no}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{r.full_name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold">
                          {r.sessions_present} / {r.sessions_total}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${freq >= 75 ? "bg-emerald-500" : freq >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                style={{ width: `${Math.min(freq, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-700">{freq}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-700 text-base">
                          {r.total_score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
