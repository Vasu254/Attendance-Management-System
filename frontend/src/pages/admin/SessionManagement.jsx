import { useEffect, useState } from "react";
import { FiLock, FiPlus, FiUnlock } from "react-icons/fi";
import api from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);
const blank = { session_date: today, start_time: "09:00", end_time: "10:00", session_type: "CLASS", batch: "", section: "", subject: "", room: "", mentor_id: "" };

export default function SessionManagement() {
  const [form, setForm] = useState(blank);
  const [sessions, setSessions] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = () => api.get("/admin/sessions", { params: { start_date: form.session_date, end_date: form.session_date } }).then((res) => setSessions(res.data));
  useEffect(() => { load(); }, [form.session_date]);
  useEffect(() => { api.get("/admin/mentors").then((res) => setMentors(res.data)).catch(() => setMentors([])); }, []);

  const create = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await api.post("/admin/sessions", { ...form, mentor_id: form.mentor_id ? Number(form.mentor_id) : null, batch: form.batch || null, section: form.section || null, subject: form.subject || null, room: form.room || null });
      setMessage("Session created. Activate it when students can mark attendance."); await load();
    } catch (err) { setError(err.response?.data?.message || "Unable to create session."); }
  };
  const action = async (session, name) => {
    try { await api.put(`/admin/sessions/${session.id}/${name}`); setMessage(name === "activate" ? "Attendance is now active." : "Attendance session closed."); await load(); }
    catch (err) { setError(err.response?.data?.message || "Unable to update session."); }
  };
  return <div className="space-y-6">
    <section className="surface p-5">
      <div><p className="text-sm font-bold uppercase tracking-normal text-brand">Class & mentoring stay separate</p><h2 className="mt-1 text-xl font-black text-ink">Session Management</h2></div>
      {(message || error) && <p className={`mt-4 rounded-md px-3 py-2 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"}`}>{error || message}</p>}
      <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={create}>
        <Field label="Date" type="date" value={form.session_date} onChange={(session_date) => { setForm({ ...form, session_date }); }} />
        <label><span className="label">Session type</span><select className="field" value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}><option value="CLASS">CLASS</option><option value="MENTORING">MENTORING</option></select></label>
        <Field label="Start time" type="time" value={form.start_time} onChange={(start_time) => setForm({ ...form, start_time })} />
        <Field label="End time" type="time" value={form.end_time} onChange={(end_time) => setForm({ ...form, end_time })} />
        <Field label="Batch" placeholder="All batches" value={form.batch} onChange={(batch) => setForm({ ...form, batch })} required={false} />
        <Field label="Section" placeholder="All sections" value={form.section} onChange={(section) => setForm({ ...form, section })} required={false} />
        <Field label="Subject / topic" placeholder="Optional" value={form.subject} onChange={(subject) => setForm({ ...form, subject })} required={false} />
        <Field label="Room / online link" placeholder="Optional" value={form.room} onChange={(room) => setForm({ ...form, room })} required={false} />
        <label><span className="label">Assigned mentor</span><select className="field" value={form.mentor_id} onChange={(e) => setForm({ ...form, mentor_id: e.target.value })}><option value="">My account / unassigned</option>{mentors.filter((mentor) => mentor.is_active).map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.username}</option>)}</select></label>
        <button className="btn-primary xl:col-span-4"><FiPlus /> Create {form.session_type === "CLASS" ? "Class" : "Mentoring"} Session</button>
      </form>
    </section>
    <section className="surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><h2 className="font-black text-ink">Sessions for {form.session_date}</h2><button className="btn-secondary" onClick={load}>Refresh</button></div>
      <div className="table-wrap border-0 shadow-none"><table className="data-table"><thead><tr><th>Type</th><th>Topic</th><th>Time</th><th>Audience</th><th>Status</th><th>Attendance control</th></tr></thead><tbody className="divide-y divide-slate-100">
        {sessions.map((session) => <tr key={session.id}><td><span className={`rounded-full px-2 py-1 text-xs font-black ${session.session_type === "CLASS" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>{session.session_type}</span></td><td className="font-bold text-ink">{session.subject || "Untitled session"}<p className="text-xs font-normal text-slate-500">{session.room || "No location specified"}</p></td><td>{session.start_time} – {session.end_time}</td><td>{session.batch || "All"}{session.section ? ` / ${session.section}` : ""}</td><td>{session.status}</td><td className="flex gap-2">{session.status !== "ACTIVE" && session.status !== "COMPLETED" && <button className="btn-primary px-3" onClick={() => action(session, "activate")}><FiUnlock /> Activate</button>}{session.status === "ACTIVE" && <button className="btn-secondary px-3" onClick={() => action(session, "close")}><FiLock /> Close</button>}</td></tr>)}
        {!sessions.length && <tr><td colSpan="6" className="py-10 text-center text-slate-500">No sessions created for this date.</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}

function Field({ label, value, onChange, type = "text", placeholder, required = true }) { return <label><span className="label">{label}</span><input className="field" type={type} value={value} placeholder={placeholder} required={required} onChange={(e) => onChange(e.target.value)} /></label>; }
