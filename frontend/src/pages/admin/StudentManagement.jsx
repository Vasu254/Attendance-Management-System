import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import api from "../../api/axios";

const blank = {
  student_id: "",
  full_name: "",
  email: "",
  mobile_number: "",
  course: "",
  batch: "",
  section: "",
  username: "",
  password: "",
  is_active: true,
};

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ batch: "", section: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/admin/students", { params: { search, ...filters } })
      .then((res) => setStudents(res.data));

  useEffect(() => {
    load();
  }, []);

  const batches = useMemo(() => [...new Set(students.map((s) => s.batch).filter(Boolean))], [students]);
  const sections = useMemo(() => [...new Set(students.map((s) => s.section).filter(Boolean))], [students]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const payload = { ...form };
      if (editing) {
        delete payload.password;
        await api.put(`/admin/students/${editing}`, payload);
        setMessage("Student updated successfully");
      } else {
        await api.post("/admin/students", payload);
        setMessage("Student added successfully");
      }
      setForm(blank);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save student");
    }
  };

  const edit = (student) => {
    setEditing(student.id);
    setForm({ ...student, password: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (student) => {
    if (!confirm(`Delete ${student.full_name}?`)) return;
    await api.delete(`/admin/students/${student.id}`);
    await load();
  };

  const toggleStatus = async (student) => {
    await api.put(`/admin/students/${student.id}/status`, { is_active: !student.is_active });
    await load();
  };

  const resetPassword = async (student) => {
    const password = prompt(`New password for ${student.full_name}`);
    if (!password) return;
    try {
      await api.put(`/admin/students/${student.id}/reset-password`, { password });
      setMessage("Password reset successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">{editing ? "Edit Student" : "Add Student"}</h2>
        {(message || error) && (
          <div className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>
            {error || message}
          </div>
        )}
        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <Input label="Student ID" value={form.student_id} onChange={(v) => setForm({ ...form, student_id: v })} />
          <Input label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Mobile Number" value={form.mobile_number} onChange={(v) => setForm({ ...form, mobile_number: v })} />
          <Input label="Course" value={form.course} onChange={(v) => setForm({ ...form, course: v })} />
          <Input label="Batch" value={form.batch} onChange={(v) => setForm({ ...form, batch: v })} />
          <Input label="Section" value={form.section} onChange={(v) => setForm({ ...form, section: v })} />
          <Input label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          {!editing && <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />}
          <label className="flex items-end gap-3 pb-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            Active account
          </label>
          <div className="flex items-end gap-2">
            <button className="btn-primary">
              <FiPlus /> {editing ? "Update Student" : "Add Student"}
            </button>
            {editing && (
              <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm(blank); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" />
            <input className="field pl-9" placeholder="Search by name or student ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="field" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}>
            <option value="">All batches</option>
            {batches.map((batch) => <option key={batch}>{batch}</option>)}
          </select>
          <select className="field" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
            <option value="">All sections</option>
            {sections.map((section) => <option key={section}>{section}</option>)}
          </select>
          <button className="btn-secondary" onClick={load}>Apply</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Batch</th>
                <th>Username</th>
                <th>Today</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <p className="font-bold text-ink">{student.full_name}</p>
                    <p className="text-xs text-slate-500">{student.student_id} · {student.email}</p>
                  </td>
                  <td>{student.course}</td>
                  <td>{student.batch} / {student.section}</td>
                  <td>{student.username}</td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${student.progress?.today_status === "PRESENT" ? "bg-teal-50 text-teal-700" : "bg-orange-50 text-coral"}`}>
                      {student.progress?.today_status || "NOT MARKED"}
                    </span>
                  </td>
                  <td className="min-w-44">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${student.progress?.below_75 ? "bg-red-500" : "bg-brand"}`}
                          style={{ width: `${Math.min(student.progress?.attendance_percentage || 0, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-black ${student.progress?.below_75 ? "text-red-700" : "text-brand"}`}>
                        {student.progress?.attendance_percentage || 0}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {student.progress?.present_days || 0}/{student.progress?.total_sessions || 0} sessions
                    </p>
                  </td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${student.is_active ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}>
                      {student.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary px-3" onClick={() => edit(student)} aria-label="Edit"><FiEdit2 /></button>
                      <button className="btn-secondary px-3" onClick={() => resetPassword(student)} aria-label="Reset password"><FiRefreshCw /></button>
                      <button className="btn-secondary" onClick={() => toggleStatus(student)}>{student.is_active ? "Deactivate" : "Activate"}</button>
                      <button className="btn-danger px-3" onClick={() => remove(student)} aria-label="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-500">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} required />
    </div>
  );
}
