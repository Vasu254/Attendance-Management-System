import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const today = new Date().toISOString().slice(0, 10);

export default function AttendanceMonitoring() {
  const [filters, setFilters] = useState({ date: today, search: "", course: "", batch: "", section: "" });
  const [data, setData] = useState(null);

  const load = () => api.get("/admin/attendance/monitoring", { params: filters }).then((res) => setData(res.data));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[170px_1fr_160px_160px_160px_auto]">
        <input className="field" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input className="field pl-9" placeholder="Search name or student ID" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <input className="field" placeholder="Course" value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })} />
        <input className="field" placeholder="Batch" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })} />
        <input className="field" placeholder="Section" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} />
        <button className="btn-primary" onClick={load}>Filter</button>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Eligible Students" value={data.total_eligible_students} />
            <StatCard label="Students Present" value={data.students_present} tone="gold" />
            <StatCard label="Not Marked" value={data.students_not_marked} tone="coral" />
            <StatCard label="Attendance" value={`${data.attendance_percentage}%`} tone="slate" />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Section</th>
                  <th>Marked Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.students.map((student) => (
                  <tr key={student.id}>
                    <td className="font-bold text-ink">{student.student_id}</td>
                    <td>{student.full_name}</td>
                    <td>{student.course}</td>
                    <td>{student.batch}</td>
                    <td>{student.section}</td>
                    <td>{student.marked_time || "--"}</td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${student.status === "PRESENT" ? "bg-teal-50 text-teal-700" : "bg-orange-50 text-coral"}`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!data.students.length && (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-slate-500">No eligible students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
