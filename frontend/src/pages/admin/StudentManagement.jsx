import { useCallback, useEffect, useRef, useState } from "react";
import { FiEdit2, FiPlus, FiRefreshCw, FiSearch } from "react-icons/fi";
import api from "../../api/axios";

const blank = { student_id: "", full_name: "", email: "", mobile_number: "", course: "", batch: "", section: "", username: "", password: "", is_active: true };
const PAGE_SIZE = 25;

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ batch: "", section: "" });
  const [options, setOptions] = useState({ batches: [], sections: [] });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const latestRequest = useRef(0);

  const load = useCallback(async (overrides = {}) => {
    const params = { search, ...filters, page: pagination.page, per_page: PAGE_SIZE, include_progress: showProgress, ...overrides };
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const response = await api.get("/admin/students", { params });
      if (requestId !== latestRequest.current) return;
      setStudents(response.data.students);
      setPagination({ page: response.data.page, pages: response.data.pages || 1, total: response.data.total });
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err.response?.data?.message || "Unable to retrieve students.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [search, filters, pagination.page, showProgress]);

  useEffect(() => {
    api.get("/admin/students/filters").then((res) => setOptions(res.data)).catch(() => setOptions({ batches: [], sections: [] }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load({ page: 1 }), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, filters.batch, filters.section, showProgress]); // Live search is deliberately debounced.

  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const payload = { ...form };
      if (editing) { delete payload.password; await api.put(`/admin/students/${editing}`, payload); setMessage("Student updated successfully"); }
      else { await api.post("/admin/students", payload); setMessage("Student added successfully"); }
      setForm(blank); setEditing(null); await load();
    } catch (err) { setError(err.response?.data?.message || "Unable to save student"); }
  };

  const edit = (student) => { setEditing(student.id); setForm({ ...student, password: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const archive = async (student) => { if (!confirm(`Archive ${student.full_name}? Their attendance history will be preserved.`)) return; await api.delete(`/admin/students/${student.id}`); await load(); };
  const toggleStatus = async (student) => { await api.put(`/admin/students/${student.id}/status`, { is_active: !student.is_active }); await load(); };
  const resetPassword = async (student) => { const password = prompt(`New password for ${student.full_name}`); if (!password) return; try { await api.put(`/admin/students/${student.id}/reset-password`, { password }); setMessage("Password reset successfully"); } catch (err) { setError(err.response?.data?.message || "Unable to reset password"); } };
  const changePage = (page) => { if (page < 1 || page > pagination.pages) return; load({ page }); };

  return <div className="space-y-6">
    <section className="surface p-5"><h2 className="text-lg font-black text-ink">{editing ? "Edit Student" : "Add Student"}</h2>{(message || error) && <div className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>{error || message}</div>}<form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}><Input label="Student ID" value={form.student_id} onChange={(student_id) => setForm({ ...form, student_id })} /><Input label="Full Name" value={form.full_name} onChange={(full_name) => setForm({ ...form, full_name })} /><Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} /><Input label="Mobile Number" value={form.mobile_number} onChange={(mobile_number) => setForm({ ...form, mobile_number })} /><Input label="Course" value={form.course} onChange={(course) => setForm({ ...form, course })} /><Input label="Batch" value={form.batch} onChange={(batch) => setForm({ ...form, batch })} /><Input label="Section" value={form.section} onChange={(section) => setForm({ ...form, section })} /><Input label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />{!editing && <Input label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />}<label className="flex items-end gap-3 pb-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Active account</label><div className="flex items-end gap-2"><button className="btn-primary"><FiPlus /> {editing ? "Update Student" : "Add Student"}</button>{editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}</div></form></section>

    <section className="space-y-4"><div className="flex flex-col gap-3 xl:flex-row"><div className="relative flex-1"><FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input className="field pl-9" placeholder="Start typing a student name, ID, or email" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" /></div><select className="field xl:w-48" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}><option value="">All batches</option>{options.batches.map((batch) => <option key={batch}>{batch}</option>)}</select><select className="field xl:w-48" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}><option value="">All sections</option>{options.sections.map((section) => <option key={section}>{section}</option>)}</select><button className="btn-secondary" onClick={() => setShowProgress(!showProgress)}>{showProgress ? "Hide Attendance" : "Show Attendance"}</button></div><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{loading ? "Retrieving students..." : `${pagination.total} matching students`}</span><span>{showProgress ? "Attendance summaries are loaded only for this page." : "Fast mode: attendance summaries are not calculated while searching."}</span></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Course</th><th>Batch</th><th>Username</th>{showProgress && <><th>Today</th><th>Progress</th></>}<th>Status</th><th>Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map((student) => <tr key={student.id}><td><p className="font-bold text-ink">{student.full_name}</p><p className="text-xs text-slate-500">{student.student_id} · {student.email}</p></td><td>{student.course}</td><td>{student.batch} / {student.section}</td><td>{student.username}</td>{showProgress && <><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${student.progress?.today_status === "PRESENT" ? "bg-teal-50 text-teal-700" : "bg-orange-50 text-coral"}`}>{student.progress?.today_status || "NOT MARKED"}</span></td><td className="min-w-44"><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${student.progress?.below_75 ? "bg-red-500" : "bg-brand"}`} style={{ width: `${Math.min(student.progress?.attendance_percentage || 0, 100)}%` }} /></div><span className={`text-xs font-black ${student.progress?.below_75 ? "text-red-700" : "text-brand"}`}>{student.progress?.attendance_percentage || 0}%</span></div><p className="mt-1 text-xs text-slate-500">{student.progress?.present_days || 0}/{student.progress?.total_sessions || 0} sessions</p></td></>}<td><span className={`rounded-full px-2 py-1 text-xs font-bold ${student.is_active ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}>{student.is_active ? "ACTIVE" : "INACTIVE"}</span></td><td><div className="flex flex-wrap gap-2"><button className="btn-secondary px-3" onClick={() => edit(student)} aria-label="Edit"><FiEdit2 /></button><button className="btn-secondary px-3" onClick={() => resetPassword(student)} aria-label="Reset password"><FiRefreshCw /></button><button className="btn-secondary" onClick={() => toggleStatus(student)}>{student.is_active ? "Deactivate" : "Activate"}</button><button className="btn-secondary px-3" onClick={() => archive(student)}>Archive</button></div></td></tr>)}{!students.length && !loading && <tr><td colSpan={showProgress ? 8 : 6} className="py-10 text-center text-slate-500">No students found.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-end gap-3"><button className="btn-secondary" disabled={loading || pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>Previous</button><span className="text-sm font-semibold text-slate-600">Page {pagination.page} of {pagination.pages}</span><button className="btn-secondary" disabled={loading || pagination.page >= pagination.pages} onClick={() => changePage(pagination.page + 1)}>Next</button></div>
    </section>
  </div>;
}

function Input({ label, value, onChange, type = "text" }) { return <label><span className="label">{label}</span><input className="field" type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} required /></label>; }
