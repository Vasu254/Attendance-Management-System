import { useEffect, useState } from "react";
import { FiDownload, FiSearch } from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [filters, setFilters] = useState({ start_date: today, end_date: today, search: "", batch: "", section: "" });
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

  const exportCsv = () => {
    api.get("/admin/reports/export", { params: filters, responseType: "blob" }).then((res) => {
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_report_${filters.start_date}_to_${filters.end_date}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }).catch((err) => setError(err.response?.data?.message || "Unable to export CSV"));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 xl:grid-cols-[170px_170px_minmax(220px,1fr)_150px_150px_auto_auto]">
        <input className="field" type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <input className="field" type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input
            className="field pl-9"
            placeholder="Search student name or ID"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <input className="field" placeholder="Batch" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })} />
        <input className="field" placeholder="Section" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} />
        <button className="btn-primary" onClick={load}>Run Report</button>
        <button className="btn-secondary" onClick={exportCsv}><FiDownload /> CSV</button>
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
        <h2 className="text-lg font-bold text-ink">Daily Summary</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Present</th>
                <th>Absent</th>
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
                  <td colSpan="5" className="py-10 text-center text-slate-500">No dates found for this report.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Student Day By Day Report</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Course</th>
                <th>Batch</th>
                <th>Section</th>
                <th>Present Days</th>
                <th>Absent Days</th>
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
                  <td>{row.full_name}</td>
                  <td>{row.course}</td>
                  <td>{row.batch}</td>
                  <td>{row.section}</td>
                  <td>{row.present_days}</td>
                  <td>{row.absent_days}</td>
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
