import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiActivity, FiCalendar, FiCheckCircle, FiCrosshair, FiMapPin, FiPercent } from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [markResult, setMarkResult] = useState("");
  const [markError, setMarkError] = useState("");
  const [location, setLocation] = useState(null);

  const load = useCallback(() => {
    api.get("/student/dashboard").then((res) => setData(res.data));
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds to pick up newly activated sessions
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setMarkError("Location access was not granted."),
      { enableHighAccuracy: true, timeout: 12000 },
    );

  const markAttendance = async (session) => {
    setMarkingId(session.id);
    setMarkError("");
    setMarkResult("");
    try {
      const res = await api.post("/student/attendance/mark", {
        session_id: session.id,
        ...(location || {}),
      });
      setMarkResult(`${session.session_type} attendance marked successfully at ${res.data.attendance.marked_time}!`);
      await load();
    } catch (err) {
      setMarkError(err.response?.data?.message || "Unable to mark attendance.");
    } finally {
      setMarkingId(null);
    }
  };

  if (!data) return <p className="text-sm text-slate-500">Loading dashboard...</p>;

  const student = data.student;
  const markableSessions = (data.active_sessions || []).filter((s) => s.can_mark);
  const hasMarkable = markableSessions.length > 0;

  return (
    <div className="space-y-6">
      <section className="surface p-5">
        <p className="text-sm font-bold uppercase tracking-normal text-brand">Welcome</p>
        <h2 className="mt-1 text-2xl font-black text-ink">{student.full_name}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {student.student_id} · {student.batch}
        </p>
      </section>

      {/* Big blinking attendance banner when sessions are markable */}
      {hasMarkable && (
        <section className="overflow-hidden rounded-lg border-2 border-teal-400 bg-gradient-to-r from-teal-50 to-emerald-50 p-5 shadow-lg">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-teal-600">
                🟢 Attendance is ACTIVE
              </p>
              <p className="mt-1 text-xl font-black text-teal-900">
                {markableSessions.length} session{markableSessions.length > 1 ? "s" : ""} ready to mark
              </p>
            </div>
            <Link className="btn-attendance-blink px-8 py-3 text-base" to="/student/mark-attendance">
              <FiCheckCircle size={20} /> MARK ATTENDANCE NOW
            </Link>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Status" value={data.today_status} icon={FiCheckCircle} />
        <StatCard label="Class Attendance" value={`${data.class_attendance?.attendance_percentage || 0}%`} icon={FiCalendar} tone="gold" />
        <StatCard label="Mentoring Attendance" value={`${data.mentoring_attendance?.attendance_percentage || 0}%`} icon={FiActivity} tone="slate" />
        <StatCard label="Overall Attendance" value={`${data.attendance_percentage}%`} icon={FiPercent} tone="coral" />
      </div>

      {/* Result/Error messages */}
      {markResult && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
          ✅ {markResult}
        </div>
      )}
      {markError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {markError}
        </div>
      )}

      {/* Today's sessions with inline mark buttons */}
      <section className="surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">Today&apos;s Class &amp; Mentoring Sessions</h2>
          <button className="btn-secondary px-3 py-1.5 text-xs" onClick={load}>
            Refresh
          </button>
        </div>
        {data.active_sessions?.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.active_sessions.map((session) => (
              <div
                key={session.id}
                className={`rounded-lg border-2 p-5 transition ${
                  session.can_mark
                    ? "border-teal-300 bg-teal-50/50 shadow-md"
                    : session.session_type === "CLASS"
                      ? "border-indigo-100 bg-indigo-50/40"
                      : "border-amber-100 bg-amber-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-normal text-slate-500">{session.session_type}</p>
                    <p className="mt-1 text-lg font-black text-ink">{session.subject || "Attendance session"}</p>
                    <p className="mt-1 text-sm text-slate-600">{session.start_time} – {session.end_time}</p>
                    {session.batch && <p className="mt-1 text-xs font-bold text-slate-500">Batch: {session.batch}</p>}
                  </div>
                  {session.can_mark && (
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700 animate-pulse">
                      ACTIVE
                    </span>
                  )}
                </div>

                {session.location_required && !location && session.can_mark && (
                  <button className="btn-secondary mt-3 w-full" onClick={locate}>
                    <FiCrosshair /> Verify My Location
                  </button>
                )}

                {session.can_mark ? (
                  <button
                    className="btn-attendance-blink mt-4 w-full py-3 text-base"
                    disabled={markingId === session.id || (session.location_required && !location)}
                    onClick={() => markAttendance(session)}
                  >
                    <FiCheckCircle size={18} />{" "}
                    {markingId === session.id ? "Marking..." : "MARK ATTENDANCE"}
                  </button>
                ) : (
                  <p className={`mt-4 text-center text-sm font-bold ${session.already_marked ? "text-teal-700" : "text-slate-500"}`}>
                    {session.already_marked ? "✅ Attendance Marked" : "Attendance unavailable"}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No active Class or Mentoring session right now. Sessions will appear here once your teacher activates attendance for your batch.
          </p>
        )}
      </section>
    </div>
  );
}
