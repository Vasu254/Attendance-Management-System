import { useEffect, useState } from "react";
import { FiCheck, FiSearch, FiShield, FiX, FiRotateCcw, FiUserCheck, FiUserX, FiCalendar, FiActivity } from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const today = new Date().toISOString().slice(0, 10);

export default function AttendanceMonitoring() {
  const [filters, setFilters] = useState({ date: today, search: "", batch: "", session_type: "" });
  const [targetType, setTargetType] = useState("BOTH"); // "BOTH", "CLASS", or "MENTORING"
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = (customFilters = filters) => {
    setMessage("");
    setError("");
    return api.get("/admin/attendance/monitoring", { params: customFilters }).then((res) => setData(res.data));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSessionTypeFilter = (sType) => {
    const nextFilters = { ...filters, session_type: sType };
    setFilters(nextFilters);
    load(nextFilters);
  };

  const handleManualMark = async (studentId, status, specificTarget = targetType) => {
    setUpdatingId(studentId);
    setMessage("");
    setError("");
    try {
      const res = await api.post("/admin/attendance/manual-mark", {
        student_id: studentId,
        date: filters.date,
        status: status,
        session_type: specificTarget,
      });
      setMessage(res.data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update attendance.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkMark = async (status) => {
    if (!data?.students?.length) return;
    const targetLabel = targetType === "BOTH" ? "Class & Mentoring" : targetType === "CLASS" ? "Class" : "Mentoring";
    const actionLabel = status === "NOT MARKED" ? `reset ${targetLabel} attendance to Not Marked` : `mark ${targetLabel} attendance as ${status}`;
    if (!window.confirm(`Are you sure you want to ${actionLabel} for all ${data.students.length} currently listed students?`)) {
      return;
    }
    setBulkLoading(true);
    setMessage("");
    setError("");
    try {
      const studentIds = data.students.map((s) => s.id);
      const res = await api.post("/admin/attendance/bulk-manual-mark", {
        student_ids: studentIds,
        date: filters.date,
        status: status,
        session_type: targetType,
      });
      setMessage(res.data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed bulk attendance update.");
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusBadge = (status, time) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <FiCheck /> PRESENT {time && <span className="font-normal text-[10px] text-emerald-600">({time})</span>}
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <FiX /> ABSENT
          </span>
        );
      case "PERMISSION":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-200">
            <FiShield /> PERMISSION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            NOT MARKED
          </span>
        );
    }
  };

  const targetLabel = targetType === "BOTH" ? "Both (Class & Mentoring)" : targetType === "CLASS" ? "Class Only" : "Mentoring Only";

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`rounded-md px-4 py-3 text-sm font-bold transition-all ${error ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-teal-50 text-teal-800 border border-teal-200"}`}>
          {error || message}
        </div>
      )}

      {/* Session Type Division Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => handleSessionTypeFilter("")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${
              filters.session_type === "" ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"
            }`}
          >
            All Attendance
          </button>
          <button
            type="button"
            onClick={() => handleSessionTypeFilter("CLASS")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${
              filters.session_type === "CLASS" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-ink"
            }`}
          >
            <FiCalendar /> Class
          </button>
          <button
            type="button"
            onClick={() => handleSessionTypeFilter("MENTORING")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${
              filters.session_type === "MENTORING" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-ink"
            }`}
          >
            <FiActivity /> Mentoring
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[170px_1fr_180px_auto]">
        <input className="field" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input className="field pl-9" placeholder="Search student ID or email" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <input className="field" placeholder="Batch" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })} />
        <button className="btn-primary" onClick={() => load()}>Filter</button>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Eligible Students" value={data.total_eligible_students} />
            <StatCard label="Present" value={data.students_present} tone="gold" />
            <StatCard label="Absent" value={data.students_absent || 0} tone="red" />
            <StatCard label="Permission" value={data.students_permission || 0} tone="purple" />
            <StatCard label="Not Marked" value={data.students_not_marked} tone="coral" />
          </div>

          {/* Divided Attendance Progress Bars */}
          <div className="surface p-5 space-y-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-ink">Class & Mentoring Attendance Bars</h3>
                <p className="text-xs text-slate-500">Live progress breakdown for {data.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Mark Attendance For:</span>
                <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTargetType("BOTH")}
                    className={`px-3 py-1 rounded-md transition-all ${targetType === "BOTH" ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"}`}
                  >
                    Both (Class & Mentoring)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("CLASS")}
                    className={`px-3 py-1 rounded-md transition-all ${targetType === "CLASS" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-ink"}`}
                  >
                    Class Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("MENTORING")}
                    className={`px-3 py-1 rounded-md transition-all ${targetType === "MENTORING" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-ink"}`}
                  >
                    Mentoring Only
                  </button>
                </div>
              </div>
            </div>

            {/* Class Attendance Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Class Attendance
                </span>
                <span className="text-slate-600">
                  <span className="text-emerald-700">{data.class_summary?.present || 0} Present</span> ·{" "}
                  <span className="text-purple-700">{data.class_summary?.permission || 0} Permission</span> ·{" "}
                  <span className="text-rose-700">{data.class_summary?.absent || 0} Absent</span> ·{" "}
                  <span className="text-amber-700">{data.class_summary?.not_marked || 0} Not Marked</span>
                  <span className="ml-2 font-black text-emerald-700">{data.class_summary?.percentage || 0}%</span>
                </span>
              </div>
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
                <div style={{ width: `${data.total_eligible_students ? ((data.class_summary?.present || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-emerald-500 transition-all duration-500" title="Present" />
                <div style={{ width: `${data.total_eligible_students ? ((data.class_summary?.permission || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-purple-500 transition-all duration-500" title="Permission" />
                <div style={{ width: `${data.total_eligible_students ? ((data.class_summary?.absent || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-rose-500 transition-all duration-500" title="Absent" />
                <div style={{ width: `${data.total_eligible_students ? ((data.class_summary?.not_marked || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-amber-300 transition-all duration-500" title="Not Marked" />
              </div>
            </div>

            {/* Mentoring Attendance Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  Mentoring Attendance
                </span>
                <span className="text-slate-600">
                  <span className="text-emerald-700">{data.mentoring_summary?.present || 0} Present</span> ·{" "}
                  <span className="text-purple-700">{data.mentoring_summary?.permission || 0} Permission</span> ·{" "}
                  <span className="text-rose-700">{data.mentoring_summary?.absent || 0} Absent</span> ·{" "}
                  <span className="text-amber-700">{data.mentoring_summary?.not_marked || 0} Not Marked</span>
                  <span className="ml-2 font-black text-purple-700">{data.mentoring_summary?.percentage || 0}%</span>
                </span>
              </div>
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
                <div style={{ width: `${data.total_eligible_students ? ((data.mentoring_summary?.present || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-emerald-500 transition-all duration-500" title="Present" />
                <div style={{ width: `${data.total_eligible_students ? ((data.mentoring_summary?.permission || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-purple-500 transition-all duration-500" title="Permission" />
                <div style={{ width: `${data.total_eligible_students ? ((data.mentoring_summary?.absent || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-rose-500 transition-all duration-500" title="Absent" />
                <div style={{ width: `${data.total_eligible_students ? ((data.mentoring_summary?.not_marked || 0) / data.total_eligible_students) * 100 : 0}%` }} className="bg-amber-300 transition-all duration-500" title="Not Marked" />
              </div>
            </div>
          </div>

          {/* Bulk Action Controls */}
          <div className="surface p-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FiShield className="text-purple-600 text-lg" />
              <span className="text-sm font-bold text-ink">
                Bulk Actions for <span className="underline">{targetLabel}</span> ({data.students.length} students):
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={bulkLoading || !data.students.length}
                className="btn-secondary text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                onClick={() => handleBulkMark("PRESENT")}
              >
                <FiUserCheck className="inline mr-1" /> Mark All Present
              </button>
              <button
                disabled={bulkLoading || !data.students.length}
                className="btn-secondary text-xs px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                onClick={() => handleBulkMark("PERMISSION")}
              >
                <FiShield className="inline mr-1" /> Mark All Permission
              </button>
              <button
                disabled={bulkLoading || !data.students.length}
                className="btn-secondary text-xs px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                onClick={() => handleBulkMark("ABSENT")}
              >
                <FiUserX className="inline mr-1" /> Mark All Absent
              </button>
              <button
                disabled={bulkLoading || !data.students.length}
                className="btn-secondary text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-200"
                onClick={() => handleBulkMark("NOT MARKED")}
              >
                <FiRotateCcw className="inline mr-1" /> Reset Listed
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Batch</th>
                  <th>Class Status</th>
                  <th>Mentoring Status</th>
                  <th className="text-center">Manual Mark ({targetType === "BOTH" ? "Both" : targetType === "CLASS" ? "Class" : "Mentoring"})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.students.map((student) => (
                  <tr key={student.id}>
                    <td className="font-bold text-ink">{student.student_id}</td>
                    <td>{student.email}</td>
                    <td>{student.batch}</td>
                    <td>{getStatusBadge(student.class_status, student.class_marked_time)}</td>
                    <td>{getStatusBadge(student.mentoring_status, student.mentoring_marked_time)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          disabled={updatingId === student.id}
                          onClick={() => handleManualMark(student.id, "PRESENT")}
                          className="px-2.5 py-1 text-xs font-bold rounded-md border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 transition-all"
                          title={`Mark ${targetLabel} as Present`}
                        >
                          Present
                        </button>
                        <button
                          disabled={updatingId === student.id}
                          onClick={() => handleManualMark(student.id, "PERMISSION")}
                          className="px-2.5 py-1 text-xs font-bold rounded-md border border-purple-300 bg-white text-purple-700 hover:bg-purple-50 transition-all"
                          title={`Grant Permission for ${targetLabel}`}
                        >
                          Permission
                        </button>
                        <button
                          disabled={updatingId === student.id}
                          onClick={() => handleManualMark(student.id, "ABSENT")}
                          className="px-2.5 py-1 text-xs font-bold rounded-md border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 transition-all"
                          title={`Mark ${targetLabel} as Absent`}
                        >
                          Absent
                        </button>
                        <button
                          disabled={updatingId === student.id}
                          onClick={() => handleManualMark(student.id, "NOT MARKED")}
                          className="px-2 py-1 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-100"
                          title={`Reset ${targetLabel} to Not Marked`}
                        >
                          <FiRotateCcw className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data.students.length && (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-500">
                      No eligible students found.
                    </td>
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
