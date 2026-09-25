import { useEffect, useState, useCallback } from "react";
import {
  FiLock, FiPlus, FiUnlock, FiTrash2, FiEye, FiX,
  FiCopy, FiCheck, FiRefreshCw, FiAlertTriangle, FiUsers,
  FiCalendar, FiClock, FiActivity, FiCheckSquare, FiSquare,
  FiMapPin
} from "react-icons/fi";
import api from "../../api/axios";
import GoogleMapGeofence from "../../components/GoogleMapGeofence";

const today = new Date().toISOString().slice(0, 10);
const nowHour = new Date().getHours();
const pad = (n) => String(n).padStart(2, "0");
const defaultStart = `${pad(nowHour)}:00`;
const defaultEnd = `${pad((nowHour + 2) % 24)}:00`;

const blank = {
  session_date: today,
  start_time: defaultStart,
  end_time: defaultEnd,
  session_type: "CLASS",
  batch: "",
  section: "",
  subject: "",
  room: "",
  mentor_id: "",
  enable_location: false,
  location_name: "",
  latitude: "",
  longitude: "",
  radius_meters: "300",
};

// ─── Status helpers ────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    PRESENT:    "bg-teal-100 text-teal-800 ring-1 ring-teal-200",
    ABSENT:     "bg-red-100 text-red-700 ring-1 ring-red-200",
    PERMISSION: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    EXCUSED:    "bg-purple-100 text-purple-800 ring-1 ring-purple-200",
    NOT_MARKED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    OFFLINE:    "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
    ONLINE:     "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",
    HOLIDAY:    "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200",
  };
  return map[status] || "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
}

function sessionTypeBadge(type) {
  const map = {
    CLASS:     "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    MENTORING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    OTHER:     "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  };
  return map[type] || "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
}

function sessionStatusBadge(status) {
  const map = {
    ACTIVE:    "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    COMPLETED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    SCHEDULED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    CANCELLED: "bg-red-50 text-red-600 ring-1 ring-red-200",
  };
  return map[status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

const COPY_COLUMNS = [
  { key: "full_name",   label: "Student Name" },
  { key: "student_id",  label: "Enrollment No" },
  { key: "status",      label: "Attendance Status" },
  { key: "marked_time", label: "Marked Time" },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SessionManagement() {
  const [tab, setTab]           = useState("active");   // "create" | "active" | "inactive"
  const [form, setForm]         = useState(blank);
  const [sessions, setSessions] = useState([]);
  const [mentors, setMentors]   = useState([]);
  const [batches, setBatches]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState("");

  // Detail modal state
  const [detailOpen, setDetailOpen]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData]       = useState(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // Copy state
  const [selectedCols, setSelectedCols] = useState({ full_name: true, status: true, marked_time: false, student_id: false });
  const [copied, setCopied]             = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadSessions = useCallback((activeTab = tab) => {
    setLoading(true);
    const params = activeTab === "active"
      ? { status: "active" }
      : activeTab === "inactive"
      ? { status: "inactive" }
      : {};
    api.get("/admin/sessions", { params })
      .then((res) => setSessions(res.data))
      .catch(() => setError("Could not load sessions."))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { loadSessions(tab); }, [tab]);
  useEffect(() => {
    api.get("/admin/mentors").then((res) => setMentors(res.data)).catch(() => setMentors([]));
    api.get("/admin/students/filters").then((res) => {
      if (res.data?.batches) setBatches(res.data.batches);
    }).catch(() => {});
  }, []);

  // ── Create Session ────────────────────────────────────────────────────────────
  const create = async (e) => {
    e.preventDefault(); setError(""); setMessage("");
    try {
      await api.post("/admin/sessions", {
        ...form,
        mentor_id: form.mentor_id ? Number(form.mentor_id) : null,
        batch: form.batch || null,
        section: form.section || null,
        subject: form.subject || null,
        room: form.room || null,
        location_name: form.enable_location ? (form.location_name || "Campus Location") : null,
        latitude: form.enable_location ? (form.latitude || null) : null,
        longitude: form.enable_location ? (form.longitude || null) : null,
        radius_meters: form.enable_location ? (form.radius_meters || "300") : null,
      });
      setMessage("Session created successfully! Activate it when ready for attendance.");
      setForm(blank);
      if (tab === "inactive") loadSessions("inactive");
    } catch (err) { setError(err.response?.data?.message || "Unable to create session."); }
  };

  // ── Activate / Close ──────────────────────────────────────────────────────────
  const sessionAction = async (session, action) => {
    try {
      await api.put(`/admin/sessions/${session.id}/${action}`);
      setMessage(action === "activate" ? "Session activated — students can now mark attendance." : "Session closed.");
      loadSessions(tab);
    } catch (err) { setError(err.response?.data?.message || "Unable to update session."); }
  };

  // ── Open Detail Modal ─────────────────────────────────────────────────────────
  const openDetail = async (session) => {
    setDetailOpen(true); setDetailLoading(true); setDetailData(null); setCopied(false);
    try {
      const res = await api.get(`/admin/sessions/${session.id}`);
      setDetailData(res.data);
    } catch { setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  // ── Delete Session ────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/sessions/${deleteTarget.id}`);
      setMessage(`Session "${deleteTarget.subject || "Untitled"}" on ${deleteTarget.session_date} has been deleted along with its attendance records.`);
      setDeleteTarget(null);
      if (detailOpen && detailData?.session?.id === deleteTarget.id) setDetailOpen(false);
      loadSessions(tab);
    } catch (err) { setError(err.response?.data?.message || "Unable to delete session."); }
    finally { setDeleting(false); }
  };

  // ── Column-Wise Copy ──────────────────────────────────────────────────────────
  const copyAttendance = () => {
    if (!detailData?.students?.length) return;
    const activeCols = COPY_COLUMNS.filter((c) => selectedCols[c.key]);
    if (!activeCols.length) return;
    const rows = detailData.students.map((s) =>
      activeCols.map((c) => {
        const val = s[c.key];
        return val != null ? String(val) : "";
      }).join("\t")
    );
    navigator.clipboard.writeText(rows.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const toggleCol = (key) => setSelectedCols((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="surface p-5">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">Session Management</p>
        <h1 className="mt-1 text-2xl font-black text-ink">Class &amp; Mentoring Sessions</h1>
        <p className="mt-1 text-sm text-slate-500">Create sessions with Google Maps location permissions up to 300m radius, manage windows, and track attendance.</p>
      </div>

      {/* ── Toasts ── */}
      {(message || error) && (
        <div className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm ${error ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-teal-50 text-teal-800 ring-1 ring-teal-200"}`}>
          {error ? <FiAlertTriangle className="mt-0.5 shrink-0" /> : <FiCheck className="mt-0.5 shrink-0" />}
          <span>{error || message}</span>
          <button className="ml-auto shrink-0 opacity-60 hover:opacity-100" onClick={() => { setError(""); setMessage(""); }}><FiX /></button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {[
          { id: "create",   label: "Create Session",     icon: FiPlus },
          { id: "active",   label: "Active Sessions",    icon: FiActivity },
          { id: "inactive", label: "Inactive Sessions",  icon: FiCalendar },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              tab === id
                ? "bg-white text-red-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════ CREATE TAB ════════════════════ */}
      {tab === "create" && (
        <section className="surface p-6 space-y-6">
          <h2 className="text-lg font-black text-ink">New Session</h2>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={create}>
            <Field label="Date" type="date" value={form.session_date} onChange={(v) => setForm({ ...form, session_date: v })} />
            <label>
              <span className="label">Session type</span>
              <select className="field" value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}>
                <option value="CLASS">CLASS</option>
                <option value="MENTORING">MENTORING</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>
            <Field label="Start time" type="time" value={form.start_time} onChange={(v) => setForm({ ...form, start_time: v })} />
            <Field label="End time"   type="time" value={form.end_time}   onChange={(v) => setForm({ ...form, end_time: v })} />
            <div>
              <Field label="Batch" placeholder="All batches (e.g. 64)" list="session-batch-list" value={form.batch} onChange={(v) => setForm({ ...form, batch: v })} required={false} />
              <datalist id="session-batch-list">
                {batches.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <Field label="Section"  placeholder="All sections"  value={form.section}  onChange={(v) => setForm({ ...form, section: v })}  required={false} />
            <Field label="Subject / topic"     placeholder="Optional" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} required={false} />
            <Field label="Room / online link"  placeholder="Optional" value={form.room}    onChange={(v) => setForm({ ...form, room: v })}    required={false} />
            <label className="md:col-span-2">
              <span className="label">Assigned mentor</span>
              <select className="field" value={form.mentor_id} onChange={(e) => setForm({ ...form, mentor_id: e.target.value })}>
                <option value="">My account / unassigned</option>
                {mentors.filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
              </select>
            </label>

            {/* ── Location & Google Maps Geofence Section ── */}
            <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <FiMapPin size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-ink">Google Maps Geofence Permission (300m Radius)</h3>
                    <p className="text-xs text-slate-500">Enforce classroom attendance by requiring students to be within up to 300 meters radius on Google Maps.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.enable_location}
                    onChange={(e) => setForm({ ...form, enable_location: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {form.enable_location && (
                <div className="space-y-4 pt-2 border-t border-slate-200/60">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Location / Campus Name"
                      placeholder="e.g. Main Auditorium, Block B, Lab 3"
                      value={form.location_name}
                      onChange={(v) => setForm({ ...form, location_name: v })}
                      required={false}
                    />
                    <div>
                      <label className="label">Allowed Geofence Radius (Meters)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="field flex-1"
                          value={form.radius_meters}
                          onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                          placeholder="300"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, radius_meters: "300" })}
                          className="rounded-lg bg-teal-100 text-teal-800 font-bold text-xs px-3 py-2 hover:bg-teal-200 shrink-0"
                        >
                          Preset 300m Radius
                        </button>
                      </div>
                    </div>
                  </div>

                  <GoogleMapGeofence
                    mode="picker"
                    latitude={form.latitude}
                    longitude={form.longitude}
                    radiusMeters={form.radius_meters}
                    locationName={form.location_name}
                    onChange={(loc) =>
                      setForm((prev) => ({
                        ...prev,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        radius_meters: loc.radius_meters,
                        location_name: loc.location_name,
                      }))
                    }
                  />
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary md:col-span-2 xl:col-span-4">
              <FiPlus /> Create {form.session_type === "CLASS" ? "Class" : form.session_type === "MENTORING" ? "Mentoring" : "Other"} Session
            </button>
          </form>
        </section>
      )}

      {/* ════════════════════ SESSIONS LIST (ACTIVE / INACTIVE) ════════════════════ */}
      {(tab === "active" || tab === "inactive") && (
        <section className="surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-black text-ink">{tab === "active" ? "Active Sessions" : "Inactive Sessions"}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{sessions.length} session{sessions.length !== 1 ? "s" : ""} found</p>
            </div>
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => loadSessions(tab)}>
              <FiRefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <FiRefreshCw className="animate-spin" size={18} />
              <span className="text-sm font-semibold">Loading sessions…</span>
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="py-16 text-center">
              <FiCalendar className="mx-auto mb-3 text-slate-300" size={36} />
              <p className="text-sm font-semibold text-slate-400">
                {tab === "active" ? "No active sessions right now." : "No inactive sessions found."}
              </p>
            </div>
          )}

          {!loading && sessions.length > 0 && (
            <div className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  tab={tab}
                  onView={() => openDetail(session)}
                  onActivate={() => sessionAction(session, "activate")}
                  onClose={() => sessionAction(session, "close")}
                  onDelete={() => setDeleteTarget(session)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ════════════════════ DETAIL MODAL ════════════════════ */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" role="dialog" aria-modal="true">
          <button className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDetailOpen(false)} aria-label="Close" />
          <div className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl overflow-y-auto">
            {/* Modal header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-brand">Session Attendance</p>
                {detailData && (
                  <>
                    <h2 className="mt-1 text-xl font-black text-ink">
                      {detailData.session.subject || "Untitled Session"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {detailData.session.session_date} · {detailData.session.start_time}–{detailData.session.end_time} ·{" "}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${sessionTypeBadge(detailData.session.session_type)}`}>
                        {detailData.session.session_type}
                      </span>
                    </p>
                  </>
                )}
              </div>
              <button className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => setDetailOpen(false)}>
                <FiX size={20} />
              </button>
            </div>

            {/* Loading */}
            {detailLoading && (
              <div className="flex flex-1 items-center justify-center gap-3 text-slate-400 py-16">
                <FiRefreshCw className="animate-spin" size={20} />
                <span className="text-sm font-semibold">Loading attendance…</span>
              </div>
            )}

            {/* Content */}
            {!detailLoading && detailData && (
              <>
                {/* Summary pills */}
                <div className="shrink-0 flex flex-wrap gap-3 border-b border-slate-100 px-6 py-4">
                  <SummaryPill label="Total" value={detailData.summary.total} color="slate" icon={FiUsers} />
                  <SummaryPill label="Present" value={detailData.summary.present} color="teal" />
                  <SummaryPill label="Absent" value={detailData.summary.absent} color="red" />
                  <SummaryPill label="Permission" value={detailData.summary.permission} color="amber" />
                  <SummaryPill
                    label="Attendance %"
                    value={detailData.summary.total
                      ? `${Math.round((detailData.summary.present / detailData.summary.total) * 100)}%`
                      : "0%"}
                    color="indigo"
                  />
                </div>

                {/* Google Maps View if location permission set */}
                {detailData.session.location_required && (
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Google Maps Session Location Permission (300m Radius)</h3>
                    <GoogleMapGeofence
                      mode="viewer"
                      latitude={detailData.session.latitude}
                      longitude={detailData.session.longitude}
                      radiusMeters={detailData.session.radius_meters || 300}
                      locationName={detailData.session.location_name}
                    />
                  </div>
                )}

                {/* Copy tools */}
                <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Copy Attendance (select columns)</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {COPY_COLUMNS.map((col) => (
                      <button
                        key={col.key}
                        onClick={() => toggleCol(col.key)}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition ring-1 ${
                          selectedCols[col.key]
                            ? "bg-red-600 text-white ring-red-600"
                            : "bg-white text-slate-500 ring-slate-200 hover:ring-red-300"
                        }`}
                      >
                        {selectedCols[col.key] ? <FiCheckSquare size={12} /> : <FiSquare size={12} />}
                        {col.label}
                      </button>
                    ))}
                    <button
                      onClick={copyAttendance}
                      disabled={!Object.values(selectedCols).some(Boolean)}
                      className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-black transition ${
                        copied
                          ? "bg-teal-600 text-white"
                          : "bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                      }`}
                    >
                      {copied ? <><FiCheck size={13} /> Copied!</> : <><FiCopy size={13} /> Copy Selected</>}
                    </button>
                  </div>
                </div>

                {/* Roster table */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left">
                      <tr>
                        <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-400">#</th>
                        <th className="px-3 py-3 text-xs font-black uppercase tracking-wider text-slate-400">Student</th>
                        <th className="px-3 py-3 text-xs font-black uppercase tracking-wider text-slate-400">Enroll. No</th>
                        <th className="px-3 py-3 text-xs font-black uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-3 py-3 text-xs font-black uppercase tracking-wider text-slate-400">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailData.students?.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-xs text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-3 font-bold text-ink">{s.full_name || s.student_id}</td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-500">{s.student_id}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge(s.status)}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-500">{s.marked_time || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <FiAlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-ink">Delete Session?</h3>
              <p className="mt-1 text-sm text-slate-500">
                Are you sure you want to delete session <span className="font-bold text-ink">"{deleteTarget.subject || "Untitled"}"</span> on {deleteTarget.session_date}? This will permanently remove its attendance records.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Session Row ───────────────────────────────────────────────────────────────
function SessionRow({ session, tab, onView, onActivate, onClose, onDelete }) {
  const pct = session.total_eligible
    ? Math.round((session.present_count / session.total_eligible) * 100)
    : 0;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
      {/* Type badge */}
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${sessionTypeBadge(session.session_type)}`}>
        {session.session_type}
      </span>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <p className="font-black text-ink truncate">{session.subject || "Untitled Session"}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          <span className="flex items-center gap-1"><FiCalendar size={11} /> {session.session_date}</span>
          <span className="flex items-center gap-1"><FiClock size={11} /> {session.start_time}–{session.end_time}</span>
          {session.batch && <span>Batch: {session.batch}{session.section ? ` / ${session.section}` : ""}</span>}
          {session.room && <span>{session.room}</span>}
          {session.location_required && (
            <span className="flex items-center gap-1 font-bold text-teal-700 bg-teal-50 ring-1 ring-teal-200 px-2 py-0.5 rounded-full">
              <FiMapPin size={11} className="text-red-500" />
              Google Maps Geofence ({session.radius_meters ? Math.round(session.radius_meters) : 300}m)
            </span>
          )}
        </div>
      </div>

      {/* Attendance pill */}
      <div className="shrink-0 flex flex-col items-center">
        <div className="flex items-center gap-1 text-sm font-black text-ink">
          <span className="text-teal-600">{session.present_count}</span>
          <span className="text-slate-300">/</span>
          <span>{session.total_eligible}</span>
        </div>
        <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="mt-0.5 text-[10px] font-bold text-slate-400">{pct}% present</span>
      </div>

      {/* Status badge */}
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${sessionStatusBadge(session.status)}`}>
        {session.status}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 transition"
          onClick={onView}
          title="View attendance"
        >
          <FiEye size={13} /> View
        </button>
        {session.status !== "ACTIVE" && session.status !== "COMPLETED" && session.status !== "CANCELLED" && (
          <button
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-black text-white hover:bg-teal-700 transition"
            onClick={onActivate}
          >
            <FiUnlock size={13} /> Activate
          </button>
        )}
        {session.status === "ACTIVE" && (
          <button
            className="flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-700 transition"
            onClick={onClose}
          >
            <FiLock size={13} /> Close
          </button>
        )}
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 transition"
          onClick={onDelete}
          title="Delete session"
        >
          <FiTrash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── Summary Pill ──────────────────────────────────────────────────────────────
function SummaryPill({ label, value, color, icon: Icon }) {
  const colorMap = {
    slate:  "bg-slate-100 text-slate-700",
    teal:   "bg-teal-100 text-teal-800",
    red:    "bg-red-100 text-red-700",
    amber:  "bg-amber-100 text-amber-800",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${colorMap[color] || colorMap.slate}`}>
      {Icon && <Icon size={13} />}
      <span className="text-xs font-bold">{label}:</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}

// ─── Field Helper ──────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder, required = true, list }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        list={list}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
