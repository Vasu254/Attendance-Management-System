import { useEffect, useState, useCallback } from "react";
import {
  FiLock, FiPlus, FiUnlock, FiTrash2, FiEye, FiX,
  FiCopy, FiCheck, FiRefreshCw, FiAlertTriangle, FiUsers,
  FiCalendar, FiClock, FiActivity, FiCheckSquare, FiSquare
} from "react-icons/fi";
import api from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);
const blank = {
  session_date: today, start_time: "09:00", end_time: "10:00",
  session_type: "CLASS", batch: "", section: "", subject: "", room: "", mentor_id: ""
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
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState("");

  // Detail modal state
  const [detailOpen, setDetailOpen]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData]       = useState(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null); // session object
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
  }, []);

  // ── Create Session ────────────────────────────────────────────────────────────
  const create = async (e) => {
    e.preventDefault(); setError(""); setMessage("");
    try {
      await api.post("/admin/sessions", {
        ...form,
        mentor_id: form.mentor_id ? Number(form.mentor_id) : null,
        batch: form.batch || null, section: form.section || null,
        subject: form.subject || null, room: form.room || null,
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
        <p className="mt-1 text-sm text-slate-500">Create sessions, manage attendance windows, and view or delete session records.</p>
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
        <section className="surface p-6">
          <h2 className="mb-5 text-lg font-black text-ink">New Session</h2>
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
            <Field label="Batch"    placeholder="All batches"   value={form.batch}    onChange={(v) => setForm({ ...form, batch: v })}    required={false} />
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
          <div className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
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
              <div className="flex flex-1 items-center justify-center gap-3 text-slate-400">
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
                    <tbody className="divide-y divide-slate-50">
                      {detailData.students.map((s, idx) => (
                        <tr key={s.id} className={s.status === "ABSENT" ? "bg-red-50/40" : ""}>
                          <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-3 font-semibold text-ink">{s.full_name}</td>
                          <td className="px-3 py-3 text-slate-500">{s.student_id}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge(s.status)}`}>
                              {s.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-500">{s.marked_time || "—"}</td>
                        </tr>
                      ))}
                      {detailData.students.length === 0 && (
                        <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-400">No eligible students found for this session.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <button
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 transition"
                    onClick={() => { setDeleteTarget(detailData.session); setDetailOpen(false); }}
                  >
                    <FiTrash2 size={15} /> Delete this session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════ DELETE CONFIRMATION ════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} aria-label="Cancel" />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                <FiAlertTriangle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="font-black text-ink">Delete Session?</p>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="mb-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              <p className="font-bold text-ink">{deleteTarget.subject || "Untitled Session"}</p>
              <p className="mt-1">{deleteTarget.session_date} · {deleteTarget.start_time}–{deleteTarget.end_time}</p>
              <p className="mt-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-black ${sessionTypeBadge(deleteTarget.session_type)}`}>
                  {deleteTarget.session_type}
                </span>
                {deleteTarget.batch && <span className="ml-2 text-xs text-slate-500">Batch: {deleteTarget.batch}</span>}
              </p>
              <p className="mt-3 text-xs font-bold text-red-600">
                ⚠ All attendance records for this session will also be permanently deleted.
                Other sessions and their attendance records will not be affected.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-red-700 transition disabled:opacity-60"
                onClick={confirmDelete}
                disabled={deleting}
              >
                <FiTrash2 size={14} />
                {deleting ? "Deleting…" : "Yes, Delete Session"}
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
function Field({ label, value, onChange, type = "text", placeholder, required = true }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
