import { useEffect, useState } from "react";
import { FiLock, FiUnlock } from "react-icons/fi";
import api from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);

export default function AttendancePermission() {
  const [permission, setPermission] = useState(null);
  const [form, setForm] = useState({
    attendance_date: today,
    start_time: "09:00",
    end_time: "10:00",
    status: "OPEN",
    batch: "",
    section: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = (date = form.attendance_date) =>
    api.get("/admin/attendance-permissions/today", { params: { date } }).then((res) => setPermission(res.data));

  useEffect(() => {
    load();
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api.post("/admin/attendance-permissions", {
        ...form,
        batch: form.batch || null,
        section: form.section || null,
      });
      setPermission(res.data);
      setMessage("Attendance permission saved");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save permission");
    }
  };

  const changeStatus = async (status) => {
    if (!permission) return;
    const action = status === "OPEN" ? "open" : "close";
    const res = await api.put(`/admin/attendance-permissions/${permission.id}/${action}`);
    setPermission(res.data);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">Attendance Permission</h2>
        {(message || error) && (
          <div className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>
            {error || message}
          </div>
        )}
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={create}>
          <div>
            <label className="label">Attendance Date</label>
            <input
              className="field"
              type="date"
              value={form.attendance_date}
              onChange={(event) => {
                const next = event.target.value;
                setForm({ ...form, attendance_date: next });
                load(next);
              }}
              required
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
          <div>
            <label className="label">Start Time</label>
            <input className="field" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          </div>
          <div>
            <label className="label">End Time</label>
            <input className="field" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
          </div>
          <div>
            <label className="label">Batch</label>
            <input className="field" placeholder="All batches" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
          </div>
          <div>
            <label className="label">Section</label>
            <input className="field" placeholder="All sections" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary">Save Attendance Permission</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">Selected Date Status</h2>
        {permission ? (
          <div className="mt-5 space-y-4">
            <div className={`rounded-lg p-4 ${permission.status === "OPEN" ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"}`}>
              <p className="text-sm font-semibold">Status</p>
              <p className="mt-1 text-3xl font-black">{permission.status}</p>
            </div>
            <Info label="Date" value={permission.attendance_date} />
            <Info label="Time" value={`${permission.start_time} - ${permission.end_time}`} />
            <Info label="Batch" value={permission.batch || "All"} />
            <Info label="Section" value={permission.section || "All"} />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={() => changeStatus("OPEN")}><FiUnlock /> Open</button>
              <button className="btn-secondary" onClick={() => changeStatus("CLOSED")}><FiLock /> Close</button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No permission exists for this date yet.</p>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}
