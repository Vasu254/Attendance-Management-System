import { useEffect, useState, useCallback } from "react";
import { FiCheckCircle, FiCrosshair, FiMapPin, FiRefreshCw } from "react-icons/fi";
import api from "../../api/axios";

export default function SessionMarkAttendance() {
  const [sessions, setSessions] = useState(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(null);
  const [location, setLocation] = useState(null);

  const load = useCallback(() => {
    api
      .get("/student/sessions/active")
      .then((res) => setSessions(res.data))
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setError("Location access was not granted."),
      { enableHighAccuracy: true, timeout: 12000 },
    );

  const mark = async (session) => {
    setLoading(session.id);
    setError("");
    setResult("");
    try {
      const res = await api.post("/student/attendance/mark", {
        session_id: session.id,
        ...(location || {}),
      });
      setResult(
        `${session.session_type} attendance marked successfully at ${res.data.attendance.marked_time}!`,
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to mark attendance.");
    } finally {
      setLoading(null);
    }
  };

  if (!sessions) return <p className="text-sm text-slate-500">Loading active sessions...</p>;

  const markable = sessions.filter((s) => s.can_mark);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-brand">
              One tap attendance
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">Active Sessions</h2>
            <p className="mt-2 text-sm text-slate-500">
              Class and Mentoring attendance are independent. You can mark each eligible session once.
            </p>
          </div>
          <button className="btn-secondary shrink-0" onClick={load}>
            <FiRefreshCw /> Refresh
          </button>
        </div>

        {result && (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
            ✅ {result}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {sessions.some((s) => s.location_required) && (
          <button className="btn-secondary mt-4" onClick={locate}>
            <FiCrosshair /> {location ? "✅ Location ready" : "Verify my location"}
          </button>
        )}

        {markable.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-lg border-2 border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-teal-600">
              🟢 {markable.length} session{markable.length > 1 ? "s" : ""} ready to mark
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sessions.map((session) => (
            <article
              key={session.id}
              className={`rounded-lg border-2 p-5 transition ${
                session.can_mark
                  ? "border-teal-300 bg-teal-50/30 shadow-md"
                  : session.session_type === "CLASS"
                    ? "border-indigo-100 bg-indigo-50/30"
                    : "border-amber-100 bg-amber-50/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-normal text-slate-500">
                    {session.session_type}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-ink">
                    {session.subject || "Attendance session"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {session.start_time} – {session.end_time}
                  </p>
                  {session.batch && (
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Batch: {session.batch}
                    </p>
                  )}
                </div>
                {session.can_mark && (
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700 animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>

              {session.location_required && (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <FiMapPin /> Location check required
                </p>
              )}

              {session.can_mark ? (
                <button
                  className="btn-attendance-blink mt-5 w-full py-3 text-base"
                  disabled={loading === session.id || (session.location_required && !location)}
                  onClick={() => mark(session)}
                >
                  <FiCheckCircle size={18} />{" "}
                  {loading === session.id ? "Marking..." : "MARK ATTENDANCE"}
                </button>
              ) : (
                <p
                  className={`mt-5 text-center text-sm font-bold ${
                    session.already_marked ? "text-teal-700" : "text-slate-500"
                  }`}
                >
                  {session.already_marked ? "✅ ATTENDANCE MARKED" : "Attendance unavailable"}
                </p>
              )}
            </article>
          ))}

          {!sessions.length && (
            <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2">
              No active sessions right now. Sessions will appear here once your teacher activates
              attendance for your batch.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
