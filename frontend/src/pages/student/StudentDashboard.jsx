import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiActivity, FiCalendar, FiCheckCircle, FiPercent } from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

export default function StudentDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/student/dashboard").then((res) => setData(res.data));
  }, []);

  if (!data) return <p className="text-sm text-slate-500">Loading dashboard...</p>;

  const student = data.student;

  return (
    <div className="space-y-6">
      <section className="surface p-5">
        <p className="text-sm font-bold uppercase tracking-normal text-brand">Welcome</p>
        <h2 className="mt-1 text-2xl font-black text-ink">{student.full_name}</h2>
        <p className="mt-2 text-sm text-slate-500">{student.student_id} · {student.course} · {student.batch} / {student.section}</p>
        {data.permission.can_mark && (
          <Link className="btn-primary mt-4" to="/student/mark-attendance">
            MARK ATTENDANCE NOW
          </Link>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Status" value={data.today_status} icon={FiCheckCircle} />
        <StatCard label="Permission" value={data.permission.status} icon={FiActivity} tone="gold" />
        <StatCard label="Present Days" value={data.total_present_days} icon={FiCalendar} tone="slate" />
        <StatCard label="Attendance" value={`${data.attendance_percentage}%`} icon={FiPercent} tone="coral" />
      </div>
      <section className="surface p-5">
        <h2 className="text-lg font-black text-ink">Attendance Session</h2>
        {data.permission.permission ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Date" value={data.permission.permission.attendance_date} />
            <Info label="Time" value={`${data.permission.permission.start_time} - ${data.permission.permission.end_time}`} />
            <Info label="Eligible" value={data.permission.eligible ? "Yes" : "No"} />
            <Info label="Marked" value={data.permission.already_marked ? "Yes" : "No"} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Attendance is currently closed.</p>
        )}
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
