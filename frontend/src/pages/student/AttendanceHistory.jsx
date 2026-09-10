import { useEffect, useState } from "react";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const today = new Date().toISOString().slice(0, 10);

export default function AttendanceHistory() {
  const [filters, setFilters] = useState({ start_date: "", end_date: today, session_type: "", page: 1 });
  const [data, setData] = useState(null);

  const load = (next = filters) => api.get("/student/attendance/history", { params: next }).then((res) => setData(res.data));

  useEffect(() => {
    load();
  }, []);

  const changePage = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    load(next);
  };

  return (
    <div className="space-y-6">
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Class" value={`${data.class_attendance?.attendance_percentage || 0}%`} />
          <StatCard label="Mentoring" value={`${data.mentoring_attendance?.attendance_percentage || 0}%`} tone="slate" />
          <StatCard label="Total Sessions" value={data.total_attendance_sessions} tone="coral" />
          <StatCard label="Overall" value={`${data.attendance_percentage}%`} tone="gold" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[170px_170px_180px_auto]">
        <input className="field" type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <input className="field" type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        <select className="field" value={filters.session_type} onChange={(e) => setFilters({ ...filters, session_type: e.target.value })}><option value="">Class & Mentoring</option><option value="CLASS">Class only</option><option value="MENTORING">Mentoring only</option></select>
        <button className="btn-primary" onClick={() => load({ ...filters, page: 1 })}>Filter</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Session</th>
              <th>Marked Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.records.map((record) => (
              <tr key={record.id}>
                <td className="font-bold text-ink">{record.attendance_date}</td>
                <td>{record.session_type}</td>
                <td>{record.session_name}</td>
                <td>{record.marked_time}</td>
                <td><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(record.status)}`}>{record.status}</span></td>
              </tr>
            ))}
            {!data?.records?.length && (
              <tr>
                <td colSpan="5" className="py-10 text-center text-slate-500">No attendance history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data?.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button className="btn-secondary" disabled={filters.page <= 1} onClick={() => changePage(filters.page - 1)}>Previous</button>
          <span className="text-sm font-semibold text-slate-600">Page {filters.page} of {data.pages}</span>
          <button className="btn-secondary" disabled={filters.page >= data.pages} onClick={() => changePage(filters.page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

function statusClass(status) {
  if (status === "PRESENT") return "bg-teal-50 text-teal-700";
  if (status === "ABSENT") return "bg-red-50 text-red-700";
  if (status === "PERMISSION" || status === "EXCUSED") return "bg-amber-50 text-amber-700";
  if (status === "HOLIDAY") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
}
