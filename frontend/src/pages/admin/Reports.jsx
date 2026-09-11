import { useEffect, useState } from "react";
import { FiDownload, FiSearch, FiCalendar, FiActivity } from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [filters, setFilters] = useState({ start_date: today, end_date: today, session_type: "CLASS", search: "", batch: "" });
  const [data, setData] = useState({ dates: [], daily_summary: [], rows: [], totals: {} });
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    api
      .get("/admin/reports", { params: filters })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Unable to load report"));
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = (overrideType = null) => {
    const targetFilters = { ...filters, session_type: overrideType || filters.session_type };
    api.get("/admin/reports/export", { params: targetFilters, responseType: "blob" }).then((res) => {
      const typeLabel = targetFilters.session_type.toLowerCase();
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${typeLabel}_attendance_${targetFilters.start_date}_to_${targetFilters.end_date}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }).catch((err) => setError(err.response?.data?.message || "Unable to export CSV"));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 xl:grid-cols-[160px_160px_150px_minmax(200px,1fr)_130px_auto]">
        <input className="field" type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <input className="field" type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        <select className="field" value={filters.session_type} onChange={(e) => setFilters({ ...filters, session_type: e.target.value })}>
          <option value="CLASS">Class Sessions</option>
          <option value="MENTORING">Mentoring Sessions</option>
          <option value="ALL">All Sessions</option>
        </select>
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input
            className="field pl-9"
            placeholder="Search student ID or email"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <input className="field" placeholder="Batch" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })} />
        <button className="btn-primary" onClick={load}>Run Report</button>
      </div>

      {/* CSV Export Button Options */}
      <div className="surface p-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FiDownload className="text-brand text-lg" />
          <span className="text-sm font-bold text-ink">Download Dedicated CSV Reports:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary text-xs px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-bold"
            onClick={() => exportCsv("CLASS")}
            title="Download Class Attendance CSV"
          >
            <FiCalendar className="inline mr-1 text-emerald-600" /> Class Attendance CSV
          </button>
          <button
            className="btn-secondary text-xs px-3.5 py-2 bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200 font-bold"
            onClick={() => exportCsv("MENTORING")}
            title="Download Mentoring Attendance CSV"
          >
            <FiActivity className="inline mr-1 text-purple-600" /> Mentoring Attendance CSV
          </button>
          <button
            className="btn-secondary text-xs px-3.5 py-2 text-slate-700 bg-white hover:bg-slate-100 font-bold"
            onClick={() => exportCsv("ALL")}
            title="Download Combined Attendance CSV"
          >
            <FiDownload className="inline mr-1 text-slate-500" /> Combined All CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={data.totals?.students || 0} />
        <StatCard label="Present Days" value={data.totals?.present_days || 0} tone="gold" />
        <StatCard label="Absent Days" value={data.totals?.absent_days || 0} tone="coral" />
        <StatCard label="Total Attendance" value={`${data.totals?.percentage || 0}%`} tone="slate" />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Daily Summary ({filters.session_type})</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Permission</th>
                <th>Holiday</th>
                <th>Total Sessions</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.daily_summary.map((day) => (
                <tr key={day.date}>
                  <td className="font-bold text-ink">{day.date}</td>
                  <td>{day.present}</td>
                  <td>{day.absent}</td>
                  <td>{day.permission || 0}</td>
                  <td>{day.holiday || 0}</td>
                  <td>{day.total_sessions}</td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${day.percentage < 75 && day.total_sessions ? "bg-red-100 text-red-700" : "bg-teal-50 text-teal-700"}`}>
                      {day.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {!data.daily_summary.length && (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-500">No dates found for this report.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Student Day By Day Report ({filters.session_type})</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Email</th>
                <th>Batch</th>
                <th>Present Days</th>
                <th>Absent Days</th>
                <th>Permission</th>
                <th>Holidays</th>
                <th>Total Sessions</th>
                <th>Percentage</th>
                {data.dates.map((reportDate) => (
                  <th key={reportDate}>{reportDate}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row) => (
                <tr key={row.student_id} className={row.below_75 ? "bg-red-50/50" : ""}>
                  <td className="font-bold text-ink">{row.student_id}</td>
                  <td>{row.email}</td>
                  <td>{row.batch}</td>
                  <td>{row.present_days}</td>
                  <td>{row.absent_days}</td>
                  <td>{row.permission_days || 0}</td>
                  <td>{row.holiday_days || 0}</td>
                  <td>{row.total_sessions}</td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.below_75 ? "bg-red-100 text-red-700" : "bg-teal-50 text-teal-700"}`}>
                      {row.percentage}%
                    </span>
                  </td>
                  {row.daily_records.map((record) => (
                    <td key={`${row.student_id}-${record.date}`} className="min-w-32">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(record.status)}`}>
                        {record.status}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{record.marked_time || "--"}</p>
                    </td>
                  ))}
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={9 + data.dates.length} className="py-10 text-center text-slate-500">No report rows found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function statusClass(status) {
  if (status === "PRESENT") return "bg-teal-50 text-teal-700";
  if (status === "ABSENT") return "bg-red-100 text-red-700";
  if (status === "NOT ELIGIBLE") return "bg-slate-100 text-slate-600";
  return "bg-orange-50 text-coral";
}
