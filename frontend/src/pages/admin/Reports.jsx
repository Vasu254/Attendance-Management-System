import { useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";
import api from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [filters, setFilters] = useState({ start_date: today, end_date: today, batch: "", section: "" });
  const [data, setData] = useState({ rows: [] });

  const load = () => api.get("/admin/reports", { params: filters }).then((res) => setData(res.data));

  useEffect(() => {
    load();
  }, []);

  const exportCsv = () => {
    api.get("/admin/reports/export", { params: filters, responseType: "blob" }).then((res) => {
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "attendance_report.csv";
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[170px_170px_1fr_1fr_auto_auto]">
        <input className="field" type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <input className="field" type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        <input className="field" placeholder="Batch" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })} />
        <input className="field" placeholder="Section" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} />
        <button className="btn-primary" onClick={load}>Run Report</button>
        <button className="btn-secondary" onClick={exportCsv}><FiDownload /> CSV</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Batch</th>
              <th>Section</th>
              <th>Present Days</th>
              <th>Total Sessions</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map((row) => (
              <tr key={row.student_id} className={row.below_75 ? "bg-red-50/50" : ""}>
                <td className="font-bold text-ink">{row.student_id}</td>
                <td>{row.full_name}</td>
                <td>{row.batch}</td>
                <td>{row.section}</td>
                <td>{row.present_days}</td>
                <td>{row.total_sessions}</td>
                <td>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.below_75 ? "bg-red-100 text-red-700" : "bg-teal-50 text-teal-700"}`}>
                    {row.percentage}%
                  </span>
                </td>
              </tr>
            ))}
            {!data.rows.length && (
              <tr>
                <td colSpan="7" className="py-10 text-center text-slate-500">No report rows found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
