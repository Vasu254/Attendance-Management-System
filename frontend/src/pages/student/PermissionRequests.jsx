import { useEffect, useState } from "react";
import { FiSend } from "react-icons/fi";
import api from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);

export default function PermissionRequests() {
  const [form, setForm] = useState({ date: today, session_type: "CLASS", reason: "", remarks: "" });
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = () => api.get("/student/permission-requests").then((res) => setRequests(res.data)).catch(() => setError("Unable to load permission requests."));
  useEffect(() => { load(); }, []);
  const submit = async (event) => { event.preventDefault(); setMessage(""); setError(""); try { await api.post("/student/permission-requests", form); setForm({ ...form, reason: "", remarks: "" }); setMessage("Permission request submitted. You will see the decision here."); load(); } catch (err) { setError(err.response?.data?.message || "Unable to submit request."); } };
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"><section className="surface p-5"><h2 className="text-lg font-black text-ink">Request Permission</h2><p className="mt-1 text-sm text-slate-500">Submit a request for Class or Mentoring. Attendance is never changed by the student.</p>{(message || error) && <p className={`mt-4 rounded-md px-3 py-2 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"}`}>{error || message}</p>}<form className="mt-5 space-y-4" onSubmit={submit}><label><span className="label">Date</span><input className="field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label><label><span className="label">Attendance type</span><select className="field" value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}><option value="CLASS">Class</option><option value="MENTORING">Mentoring</option></select></label><label><span className="label">Reason</span><textarea className="field min-h-24" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required /></label><label><span className="label">Optional remarks</span><textarea className="field min-h-20" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></label><button className="btn-primary w-full"><FiSend /> Submit Permission Request</button></form></section><section className="surface overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="font-black text-ink">Request History</h2></div><div className="table-wrap border-0 shadow-none"><table className="data-table"><thead><tr><th>Date</th><th>Type</th><th>Reason</th><th>Status</th><th>Remarks</th></tr></thead><tbody className="divide-y divide-slate-100">{requests.map((item) => <tr key={item.id}><td>{item.date}</td><td>{item.session_type}</td><td>{item.reason}</td><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span></td><td>{item.remarks || "—"}</td></tr>)}{!requests.length && <tr><td colSpan="5" className="py-10 text-center text-slate-500">No permission requests yet.</td></tr>}</tbody></table></div></section></div>;
}

function statusClass(status) { if (status === "APPROVED") return "bg-teal-50 text-teal-700"; if (status === "REJECTED") return "bg-red-50 text-red-700"; return "bg-amber-50 text-amber-700"; }
