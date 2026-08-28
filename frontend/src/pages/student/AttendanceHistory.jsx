import { useEffect, useState } from "react";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const today = new Date().toISOString().slice(0, 10);

export default function AttendanceHistory() {
  const [filters, setFilters] = useState({ start_date: "", end_date: today, page: 1 });
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
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Present Days" value={data.total_present_days} />
          <StatCard label="Total Sessions" value={data.total_attendance_sessions} tone="slate" />
          <StatCard label="Attendance" value={`${data.attendance_percentage}%`} tone="gold" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[170px_170px_auto]">
        <input className="field" type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <input className="field" type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        <button className="btn-primary" onClick={() => load({ ...filters, page: 1 })}>Filter</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Marked Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.records.map((record) => (
              <tr key={record.id}>
                <td className="font-bold text-ink">{record.attendance_date}</td>
                <td>{record.marked_time}</td>
                <td><span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700">{record.status}</span></td>
              </tr>
            ))}
            {!data?.records?.length && (
              <tr>
                <td colSpan="3" className="py-10 text-center text-slate-500">No attendance history found.</td>
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
