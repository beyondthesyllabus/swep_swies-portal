import { useRef, useState } from "react";
import publicClient from "../../api/publicClient";
import useReferenceData from "../../api/useReferenceData";
import Card from "../../components/Card";
import Select from "../../components/Select";
import Button from "../../components/Button";
import {
  Camera, CheckCircle2, User, Mail, GraduationCap, AlertCircle, RefreshCw,
  QrCode, IdCard, Building2, Hash, ShieldCheck, FileBadge,
} from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-900 " +
  "placeholder:text-slate-400 placeholder:font-medium outline-none transition-all " +
  "focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10";

function FieldLabel({ icon: Icon, children, hint }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
        {Icon && <Icon className="h-3.5 w-3.5 text-teal-600" />}
        {children}
      </span>
      {hint && <span className="text-[10px] font-medium text-slate-400">{hint}</span>}
    </div>
  );
}

function SectionHeading({ step, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[12px] font-bold text-white shadow-sm">
        {step}
      </span>
      <div>
        <h3 className="font-display text-[15px] font-bold leading-tight text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default function Register() {
  const { departments, levels } = useReferenceData();
  const [form, setForm] = useState({
    reg_no: "", first_name: "", surname: "", other_names: "", email: "", department: "", level: "",
  });
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function startCamera() {
    setResult(null);
    setCameraOn(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setResult({ type: "error", text: "Unable to access camera. Please allow camera permissions and try again." });
      setCameraOn(false);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
    setResult(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!photoDataUrl) {
      setResult({ type: "error", text: "Please capture your enrolment photo before submitting." });
      return;
    }
    if (!form.level || !form.department) {
      setResult({ type: "error", text: "Please select both your academic level and department." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const photoBlob = await (await fetch(photoDataUrl)).blob();
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      body.append("photo", photoBlob, "registration.jpg");

      const { data } = await publicClient.post("/students/registrations/register/", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult({ type: "success", text: data.message });
    } catch (err) {
      setResult({ type: "error", text: err.response?.data?.detail || "Registration failed — please check your details." });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.type === "success") {
    return (
      <div className="watermark-dark relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
        <div className="pointer-events-none absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
        <Card className="glass-dark animate-slide-up z-10 w-full max-w-lg border-emerald-500/30 p-8 text-center text-white shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-glow">
            <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
          </div>
          <h1 className="font-display mb-2 text-2xl font-bold text-white">Registration Received</h1>
          <p className="mb-6 text-sm leading-relaxed text-slate-300">{result.text}</p>

          <div className="mb-6 space-y-2 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-left text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Registration No.</span>
              <span className="font-mono font-bold text-teal-400">{form.reg_no}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Full Name</span>
              <span className="font-semibold text-slate-200">{form.first_name} {form.surname}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cohort</span>
              <span className="font-semibold text-slate-200">
                Level {levels.find((l) => String(l.value) === String(form.level))?.label ?? form.level}
              </span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-400">
            You will receive an email notification once an administrator reviews your registration and issues your attendance card.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="watermark-dark relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute left-10 top-10 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <form onSubmit={handleSubmit} className="animate-fade-in z-10 w-full max-w-2xl">
        {/* Institutional header */}
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-teal-500/30 bg-slate-900/80 shadow-glow">
            <img src="/faculty.png" alt="Faculty crest" className="h-full w-full object-contain p-2" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold text-teal-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Official SWEP / SWIES Student Enrolment</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Student Registration</h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-400">Phase 1 Enrolment Portal</p>
        </header>

        <Card className="space-y-7 border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
          {/* Section 1 — Academic record */}
          <section className="space-y-3">
            <SectionHeading
              step="1"
              title="Academic Record"
              subtitle="Your official registration number as it appears on the class list."
            />
            <div>
              <FieldLabel icon={Hash} hint="Required">Registration Number</FieldLabel>
              <input
                placeholder="e.g. 22/EG/ME/1692"
                value={form.reg_no}
                onChange={set("reg_no")}
                required
                className={inputClass}
              />
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          {/* Section 2 — Personal details */}
          <section className="space-y-3">
            <SectionHeading
              step="2"
              title="Personal Details"
              subtitle="Enter your names exactly as recorded by the institution."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel icon={User}>First Name</FieldLabel>
                <input placeholder="First name" value={form.first_name} onChange={set("first_name")} required className={inputClass} />
              </div>
              <div>
                <FieldLabel icon={User}>Surname</FieldLabel>
                <input placeholder="Surname" value={form.surname} onChange={set("surname")} required className={inputClass} />
              </div>
            </div>
            <div>
              <FieldLabel icon={User} hint="Optional">Other Names</FieldLabel>
              <input placeholder="Middle / other names" value={form.other_names} onChange={set("other_names")} className={inputClass} />
            </div>
            <div>
              <FieldLabel icon={Mail} hint="Used for card delivery & recovery">Student Email</FieldLabel>
              <input type="email" placeholder="name@student.edu.ng" value={form.email} onChange={set("email")} required className={inputClass} />
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          {/* Section 3 — Cohort assignment */}
          <section className="space-y-3">
            <SectionHeading
              step="3"
              title="Cohort Assignment"
              subtitle="Select your current academic level and department of enrolment."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 transition-colors focus-within:border-teal-500 focus-within:bg-white">
                <Select
                  label="Academic Level"
                  value={form.level}
                  onChange={(v) => setForm((f) => ({ ...f, level: v }))}
                  options={levels}
                  placeholder="Select level…"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 transition-colors focus-within:border-teal-500 focus-within:bg-white">
                <Select
                  label="Department"
                  value={form.department}
                  onChange={(v) => setForm((f) => ({ ...f, department: v }))}
                  options={departments}
                  placeholder="Select department…"
                />
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-teal-600" />
              Levels and departments are loaded from the official programme registry.
            </p>
          </section>

          <div className="h-px bg-slate-100" />

          {/* Section 4 — Enrolment photograph */}
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <SectionHeading
                step="4"
                title="Enrolment Photograph"
                subtitle="Captured live and matched by technologists at every attendance scan. Centre your face and ensure good lighting."
              />
              {photoDataUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-teal-600 underline hover:text-teal-700"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retake
                </button>
              )}
            </div>

            {photoDataUrl ? (
              <div className="relative flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <img
                  src={photoDataUrl}
                  alt="Captured enrolment photo"
                  className="h-44 w-44 rounded-xl border-2 border-teal-500 object-cover shadow-glow"
                />
                <div className="absolute bottom-6 rounded-full bg-teal-600/90 px-3 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md">
                  Photo Captured ✓
                </div>
              </div>
            ) : cameraOn ? (
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
                <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black">
                  <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-6 flex items-center justify-center rounded-2xl border-2 border-dashed border-teal-400/70">
                    <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-teal-300">Centre Face Here</span>
                  </div>
                </div>
                <Button type="button" onClick={capturePhoto} className="w-full" icon={Camera}>
                  Capture Photo
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={startCamera} className="w-full py-3" icon={Camera}>
                Open Live Camera
              </Button>
            )}
          </section>

          {result?.type === "error" && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{result.text}</span>
            </div>
          )}

          <Button type="submit" loading={submitting} className="mt-1 w-full py-3.5 text-base shadow-glow" icon={FileBadge}>
            Submit Registration
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-slate-400">
            <IdCard className="h-3.5 w-3.5 text-teal-600" />
            Your details are matched against the official class list before a card is issued.
          </p>
        </Card>
      </form>
    </div>
  );
}
