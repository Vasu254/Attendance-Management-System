import { useEffect, useState } from "react";
import { FiActivity, FiCheckCircle, FiClock, FiUserCheck, FiUserX, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      api
        .get("/admin/dashboard")
        .then((res) => setData(res.data))
        .finally(() => setLoading(false));
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value={data.total_students} icon={FiUsers} />
        <StatCard label="Active Students" value={data.active_students} icon={FiUserCheck} tone="gold" />
        <StatCard label="Inactive Students" value={data.inactive_students} icon={FiUserX} tone="red" />
        <StatCard label="Attendance Status" value={data.attendance_status} icon={FiActivity} tone="slate" />
        <StatCard label="Present Today" value={data.present_today} icon={FiCheckCircle} />
        <StatCard label="Not Marked Today" value={data.not_marked_today} icon={FiClock} tone="coral" />
        <StatCard label="Eligible Students" value={data.eligible_students} icon={FiUsers} tone="slate" />
        <StatCard label="Today's Attendance" value={`${data.attendance_percentage}%`} icon={FiActivity} tone="gold" />
        <StatCard label="Active Class Sessions" value={data.session_counts?.CLASS?.sessions || 0} icon={FiActivity} tone="slate" />
        <StatCard label="Active Mentoring Sessions" value={data.session_counts?.MENTORING?.sessions || 0} icon={FiActivity} tone="coral" />
      </div>
      <section className="surface p-5">
        <h2 className="text-lg font-black text-ink">Current Attendance Window</h2>
        {data.permission ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Date" value={data.permission.attendance_date} />
            <Info label="Time" value={`${data.permission.start_time} - ${data.permission.end_time}`} />
            <Info label="Batch" value={data.permission.batch || "All"} />
            <Info label="Section" value={data.permission.section || "All"} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No attendance permission has been created for today.</p>
        )}
      </section>
      <section className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-black text-ink">Quick Actions</h2><p className="mt-1 text-sm text-slate-500">Activate Class and Mentoring sessions independently.</p></div><div className="flex flex-wrap gap-2"><Link className="btn-primary" to="/admin/attendance-permission">Create Session</Link><Link className="btn-secondary" to="/admin/attendance-controls">Holidays & Permissions</Link><Link className="btn-secondary" to="/admin/reports">Generate Report</Link></div></div>
        {data.active_sessions?.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{data.active_sessions.map((session) => <div key={session.id} className="rounded-md bg-teal-50 p-4 text-sm"><p className="font-black text-teal-800">{session.session_type} · {session.subject || "Attendance Session"}</p><p className="mt-1 text-teal-700">Live: {session.start_time} – {session.end_time} · {session.batch || "All batches"}</p></div>)}</div>}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}
