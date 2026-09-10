import { useEffect, useState } from "react";
import { FiCheck, FiDownload, FiX } from "react-icons/fi";
import api from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);

export default function AttendanceControls() {
  const [holiday, setHoliday] = useState({ start_date: today, end_date: today, name: "", reason: "", session_type: "", batch: "" });
  const [requests, setRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [activity, setActivity] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [mentorForm, setMentorForm] = useState({ username: "", password: "" });
  const [policy, setPolicy] = useState("EXCLUDE");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [requestsRes, holidaysRes, activityRes, policyRes, mentorsRes] = await Promise.all([api.get("/admin/permission-requests"), api.get("/admin/holidays"), api.get("/admin/activity"), api.get("/admin/settings/attendance-policy"), api.get("/admin/mentors")]);
      setRequests(requestsRes.data); setHolidays(holidaysRes.data); setActivity(activityRes.data); setPolicy(policyRes.data.permission_policy); setMentors(mentorsRes.data);
    } catch (err) { setError(err.response?.data?.message || "Unable to load attendance controls."); }
  };
  useEffect(() => { load(); }, []);
  const addHoliday = async (event) => {
    event.preventDefault(); setMessage(""); setError("");
    try { await api.post("/admin/holidays", { ...holiday, session_type: holiday.session_type || null, batch: holiday.batch || null, reason: holiday.reason || null }); setHoliday({ ...holiday, name: "", reason: "" }); setMessage("Holiday added. It is excluded from applicable attendance sessions."); load(); }
    catch (err) { setError(err.response?.data?.message || "Unable to add holiday."); }
  };
  const resolve = async (item, status) => {
    const remarks = window.prompt(`${status === "APPROVED" ? "Approval" : "Rejection"} remarks (optional):`, item.remarks || "");
    if (remarks === null) return;
    try { await api.put(`/admin/permission-requests/${item.id}`, { status, remarks }); setMessage(`Permission request ${status.toLowerCase()}.`); load(); }
    catch (err) { setError(err.response?.data?.message || "Unable to update request."); }
  };
  const savePolicy = async () => { try { await api.put("/admin/settings/attendance-policy", { permission_policy: policy }); setMessage("Attendance policy applied everywhere."); } catch (err) { setError(err.response?.data?.message || "Unable to save policy."); } };
  const backup = async () => { try { const res = await api.get("/admin/backup", { responseType: "blob" }); const url = URL.createObjectURL(res.data); const link = document.createElement("a"); link.href = url; link.download = `attendance_backup_${today}.json`; link.click(); URL.revokeObjectURL(url); } catch { setError("Unable to create backup."); } };
  const addMentor = async (event) => { event.preventDefault(); try { await api.post("/admin/mentors", mentorForm); setMentorForm({ username: "", password: "" }); setMessage("Mentor account created. Assign it to a session."); load(); } catch (err) { setError(err.response?.data?.message || "Unable to create mentor."); } };
  const toggleMentor = async (mentor) => { try { await api.put(`/admin/mentors/${mentor.id}/status`, { is_active: !mentor.is_active }); load(); } catch (err) { setError(err.response?.data?.message || "Unable to update mentor."); } };

  return <div className="space-y-6">
    {(message || error) && <div className={`rounded-md px-4 py-3 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"}`}>{error || message}</div>}
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="surface p-5"><h2 className="text-lg font-black text-ink">Holiday Management</h2><p className="mt-1 text-sm text-slate-500">Holidays never lower a student&apos;s percentage.</p><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={addHoliday}><Field label="Start date" type="date" value={holiday.start_date} onChange={(start_date) => setHoliday({ ...holiday, start_date })} /><Field label="End date" type="date" value={holiday.end_date} onChange={(end_date) => setHoliday({ ...holiday, end_date })} /><Field label="Holiday name" value={holiday.name} onChange={(name) => setHoliday({ ...holiday, name })} /><Field label="Batch" placeholder="All batches" required={false} value={holiday.batch} onChange={(batch) => setHoliday({ ...holiday, batch })} /><label><span className="label">Applies to</span><select className="field" value={holiday.session_type} onChange={(e) => setHoliday({ ...holiday, session_type: e.target.value })}><option value="">Class and Mentoring</option><option value="CLASS">Class only</option><option value="MENTORING">Mentoring only</option></select></label><Field label="Reason" value={holiday.reason} required={false} onChange={(reason) => setHoliday({ ...holiday, reason })} /><button className="btn-primary sm:col-span-2">Add Holiday</button></form><div className="mt-5 max-h-52 space-y-2 overflow-y-auto">{holidays.map((item) => <div key={item.id} className="rounded-md bg-slate-50 p-3 text-sm"><span className="font-bold text-ink">{item.name}</span><span className="ml-2 text-slate-500">{item.start_date}{item.end_date !== item.start_date ? ` to ${item.end_date}` : ""} · {item.session_type || "All"}</span></div>)}{!holidays.length && <p className="text-sm text-slate-500">No holidays have been recorded.</p>}</div></section>
      <section className="surface p-5"><h2 className="text-lg font-black text-ink">Attendance Policy & Backup</h2><p className="mt-1 text-sm text-slate-500">This one setting is used by dashboards, histories, and reports.</p><label className="mt-5 block"><span className="label">Approved permission rule</span><select className="field" value={policy} onChange={(e) => setPolicy(e.target.value)}><option value="EXCLUDE">Exclude permission from denominator</option><option value="EXCUSED">Count permission as excused attendance</option></select></label><button className="btn-primary mt-4" onClick={savePolicy}>Save Policy</button><div className="mt-8 border-t border-slate-100 pt-5"><h3 className="font-bold text-ink">Safe Data Backup</h3><p className="mt-1 text-sm text-slate-500">Exports students, legacy and session attendance, holidays, and permissions. Nothing is deleted.</p><button className="btn-secondary mt-4" onClick={backup}><FiDownload /> Download Backup</button></div></section>
      <section className="surface p-5"><h2 className="text-lg font-black text-ink">Mentor Accounts</h2><p className="mt-1 text-sm text-slate-500">Mentors can access only their assigned sessions.</p><form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={addMentor}><input className="field" placeholder="Mentor username" value={mentorForm.username} onChange={(e) => setMentorForm({ ...mentorForm, username: e.target.value })} required /><input className="field" type="password" placeholder="Temporary password" value={mentorForm.password} onChange={(e) => setMentorForm({ ...mentorForm, password: e.target.value })} required /><button className="btn-primary">Add Mentor</button></form><div className="mt-4 space-y-2">{mentors.map((mentor) => <div className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm" key={mentor.id}><span className="font-bold text-ink">{mentor.username}</span><button className="btn-secondary px-3" onClick={() => toggleMentor(mentor)}>{mentor.is_active ? "Deactivate" : "Activate"}</button></div>)}{!mentors.length && <p className="text-sm text-slate-500">No mentor accounts yet.</p>}</div></section>
    </div>
    <section className="surface overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="text-lg font-black text-ink">Student Permission Requests</h2></div><div className="table-wrap border-0 shadow-none"><table className="data-table"><thead><tr><th>Student</th><th>Date / type</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody className="divide-y divide-slate-100">{requests.map((item) => <tr key={`${item.legacy ? "legacy" : "new"}-${item.id}`}><td><p className="font-bold text-ink">{item.student_name}</p><p className="text-xs text-slate-500">{item.enrollment_id}</p></td><td>{item.date}<p className="text-xs text-slate-500">{item.session_type}</p></td><td>{item.reason}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{item.status}</span></td><td>{item.legacy ? "Saved legacy record" : item.status === "PENDING" ? <div className="flex gap-2"><button className="btn-primary px-3" onClick={() => resolve(item, "APPROVED")}><FiCheck /> Approve</button><button className="btn-secondary px-3" onClick={() => resolve(item, "REJECTED")}><FiX /> Reject</button></div> : item.remarks || "—"}</td></tr>)}{!requests.length && <tr><td colSpan="5" className="py-10 text-center text-slate-500">No permission requests.</td></tr>}</tbody></table></div></section>
    <section className="surface p-5"><h2 className="text-lg font-black text-ink">Recent Activity</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{activity.slice(0, 10).map((item) => <div key={item.id} className="rounded-md bg-slate-50 p-3 text-sm"><span className="font-bold text-ink">{item.action.replaceAll("_", " ")}</span><span className="ml-2 text-slate-500">{item.entity_type} · {new Date(item.created_at).toLocaleString()}</span></div>)}{!activity.length && <p className="text-sm text-slate-500">No tracked activity yet.</p>}</div></section>
  </div>;
}

function Field({ label, value, onChange, type = "text", placeholder, required = true }) { return <label><span className="label">{label}</span><input className="field" type={type} value={value} placeholder={placeholder} required={required} onChange={(e) => onChange(e.target.value)} /></label>; }
