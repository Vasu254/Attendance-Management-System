import { useEffect, useState, useCallback } from "react";
import { FiCheckCircle, FiCrosshair, FiMapPin, FiRefreshCw } from "react-icons/fi";
import api from "../../api/axios";
import GoogleMapGeofence from "../../components/GoogleMapGeofence";

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
      () => setError("Location access was not granted. Please allow browser location permissions."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
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

  if (!sessions) return <p className="text-sm text-slate-500 p-6">Loading active sessions...</p>;

  const markable = sessions.filter((s) => s.can_mark);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="surface p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-brand">
              One tap attendance
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">Active Sessions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Class and Mentoring attendance with Google Maps 300m radius geofencing location check.
            </p>
          </div>
          <button className="btn-secondary shrink-0" onClick={load}>
            <FiRefreshCw /> Refresh
          </button>
        </div>

        {result && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
            ✅ {result}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            ❌ {error}
          </div>
        )}

        {sessions.some((s) => s.location_required) && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <FiMapPin className="text-red-500" size={18} />
              <div>
                <p className="text-sm font-bold text-ink">Google Maps Geofence Active (300m Radius)</p>
                <p className="text-xs text-slate-500">
                  {location
                    ? `GPS position ready (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
                    : "Verify your GPS position to mark attendance"}
                </p>
              </div>
            </div>
            <button className="btn-secondary shrink-0" onClick={locate}>
              <FiCrosshair /> {location ? "✅ Location verified" : "Verify my location"}
            </button>
          </div>
        )}

        {markable.length > 0 && (
          <div className="overflow-hidden rounded-lg border-2 border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-teal-700">
              🟢 {markable.length} session{markable.length > 1 ? "s" : ""} ready to mark
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-1">
          {sessions.map((session) => (
            <article
              key={session.id}
              className={`rounded-2xl border-2 p-6 transition space-y-4 ${
                session.can_mark
                  ? "border-teal-300 bg-teal-50/20 shadow-md"
                  : session.session_type === "CLASS"
                    ? "border-indigo-100 bg-indigo-50/20"
                    : "border-amber-100 bg-amber-50/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">
                    {session.session_type}
                  </span>
                  <h3 className="mt-2 text-xl font-black text-ink">
                    {session.subject || "Attendance session"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {session.start_time} – {session.end_time}
                  </p>
                  {session.batch && (
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Batch: {session.batch} {session.section ? `/ Section ${session.section}` : ""}
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <FiMapPin className="text-red-500" />
                    <span>Location Permission: {session.location_name || "Campus Location"} (Max {session.radius_meters || 300}m radius)</span>
                  </div>

                  <GoogleMapGeofence
                    mode="viewer"
                    latitude={session.latitude}
                    longitude={session.longitude}
                    radiusMeters={session.radius_meters || 300}
                    locationName={session.location_name}
                    studentLatitude={location?.latitude}
                    studentLongitude={location?.longitude}
                  />
                </div>
              )}

              {session.can_mark ? (
                <button
                  className="btn-attendance-blink w-full py-3.5 text-base font-black"
                  disabled={loading === session.id || (session.location_required && !location)}
                  onClick={() => mark(session)}
                >
                  <FiCheckCircle size={18} />{" "}
                  {loading === session.id
                    ? "Marking..."
                    : session.location_required && !location
                    ? "Verify Location Above to Mark"
                    : "MARK ATTENDANCE NOW"}
                </button>
              ) : (
                <p
                  className={`py-3 text-center text-sm font-bold rounded-xl bg-white/60 ring-1 ${
                    session.already_marked ? "text-teal-700 ring-teal-200" : "text-slate-500 ring-slate-200"
                  }`}
                >
                  {session.already_marked ? "✅ ATTENDANCE MARKED FOR THIS SESSION" : "Attendance unavailable"}
                </p>
              )}
            </article>
          ))}

          {!sessions.length && (
            <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
              No active sessions right now. Sessions will appear here once your mentor activates
              attendance for your batch.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
