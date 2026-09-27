import { useEffect, useState, useCallback } from "react";
import client from "../../api/client";
import useReferenceData from "../../api/useReferenceData";
import SelectorBar from "../../components/SelectorBar";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Edit2, Save, UserCheck, FileText } from "lucide-react";

export default function RosterReference() {
  const { departments, levels } = useReferenceData();
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");

  const loadEntries = useCallback(async () => {
    if (!department || !level) return;
    try {
      const { data } = await client.get("/students/roster-reference/", { params: { department, level } });
      setEntries(data);
    } catch (e) {}
  }, [department, level]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function handleUpload() {
    if (!department || !level || !file) {
      setMessage({ type: "error", text: "Please select department, level, and a PDF or CSV file." });
      return;
    }
    setUploading(true);
    setMessage(null);
    const form = new FormData();
    form.append("department", department);
    form.append("level", level);
    form.append("file", file);
    try {
      const { data } = await client.post("/students/roster-reference/import/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ type: "success", text: data.message });
      await loadEntries();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  async function saveName(entry) {
    await client.post(`/students/roster-reference/${entry.id}/complete/`, { name: nameDraft });
    setEditingId(null);
    setNameDraft("");
    await loadEntries();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Official Class List Roster</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Upload and manage official student registration numbers. Student enrolment requests are automatically matched against this reference database.
        </p>
      </div>

      {/* Selectors Bar */}
      <SelectorBar fields={[
        { label: "Level", value: level, onChange: setLevel, options: levels },
        { label: "Department", value: department, onChange: setDepartment, options: departments },
      ]} />

      {/* PDF Upload Card */}
      <Card title="Upload Official Roster (PDF or CSV)" icon={Upload} subtitle="Text-based and scanned (image-only) class-list PDFs are both parsed automatically — scanned files are read with OCR, which can take up to a minute. A CSV of reg. number + name also works.">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <input
              type="file"
              accept=".pdf,.csv,application/pdf,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50/50"
            />
          </div>
          <Button onClick={handleUpload} loading={uploading} disabled={!department || !level || !file} icon={Upload} className="w-full sm:w-auto py-2.5">
            Load Class List
          </Button>
        </div>

        {message && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
            <span>{message.text}</span>
          </div>
        )}
      </Card>

      {/* Entries List */}
      {department && level && (
        <Card title="Roster Reference Entries" icon={FileText} subtitle={`${entries.length} registered entries for selected department & level`}>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileSpreadsheet className="mx-auto h-10 w-10 stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No roster entries loaded yet</p>
              <p className="text-xs mt-0.5">Upload a PDF or CSV class list above to populate this reference list.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-xl">Reg. Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{entry.reg_no}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {editingId === entry.id ? (
                          <input
                            autoFocus
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            className="rounded-xl border border-teal-500 bg-white px-3 py-1.5 text-sm font-semibold outline-none ring-2 ring-teal-500/20"
                          />
                        ) : (
                          entry.name || <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-xs font-semibold">Name Pending Completion</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {editingId === entry.id ? (
                          <Button size="sm" onClick={() => saveName(entry)} icon={Save}>
                            Save
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingId(entry.id); setNameDraft(entry.name || ""); }}
                            icon={Edit2}
                          >
                            {entry.name ? "Edit Name" : "Complete Name"}
                          </Button>
                        )}
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
