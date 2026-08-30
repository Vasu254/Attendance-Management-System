import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiCrosshair, FiMapPin, FiNavigation, FiRefreshCw, FiTarget } from "react-icons/fi";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function MarkAttendance() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const load = () =>
    api.get("/student/attendance/permission").then((res) => {
      setPermission(res.data);
      if (res.data.permission?.location_required) {
        requestLocation();
      }
    });

  useEffect(() => {
    load();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser");
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationLoading(false);
      },
      () => {
        setLocationError("Location permission is required to mark attendance for this session.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const mark = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = location ? { latitude: location.latitude, longitude: location.longitude } : {};
      const res = await api.post("/student/attendance/mark", payload);
      setResult(res.data);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to mark attendance");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <p className="text-sm text-slate-500">Loading attendance status...</p>;

  const student = user?.student;
  const today = new Date().toISOString().slice(0, 10);
  const session = permission.permission;
  const locationRequired = Boolean(session?.location_required);
  const distanceMeters = locationRequired && location ? getDistanceMeters(session.latitude, session.longitude, location.latitude, location.longitude) : null;
  const insideLocation = !locationRequired || (distanceMeters !== null && distanceMeters <= session.radius_meters);
  const canSubmit = permission.can_mark && (!locationRequired || (location && insideLocation)) && !loading;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-ink">Self Attendance</h2>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${permission.can_mark ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}>
            {permission.can_mark ? <FiCheckCircle /> : <FiAlertCircle />} {permission.can_mark ? "Ready" : "Not Ready"}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Student Name" value={student?.full_name} />
              <Info label="Student ID" value={student?.student_id} />
              <Info label="Today's Date" value={today} />
              <Info label="Attendance Status" value={permission.status} />
              <Info label="Permission" value={permission.eligible ? "Eligible" : "Not eligible"} />
              <Info label="Today's Record" value={permission.already_marked ? "PRESENT" : "NOT MARKED"} />
            </div>

            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
            {result && (
              <div className="rounded-md bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
                Attendance marked successfully! Date: {result.attendance.attendance_date} Time: {result.attendance.marked_time} Status: PRESENT
                {result.attendance.distance_meters !== null && ` · Distance: ${result.attendance.distance_meters}m`}
              </div>
            )}

            <button className="btn-primary w-full text-base" disabled={!canSubmit} onClick={mark}>
              <FiCheckCircle /> {permission.already_marked ? "ATTENDANCE ALREADY MARKED TODAY" : loading ? "Marking..." : "MARK MY ATTENDANCE"}
            </button>
            {!permission.can_mark && !permission.already_marked && (
              <p className="text-center text-sm text-slate-500">
                Attendance can be marked only while the session is open, within the allowed time, and for eligible students.
              </p>
            )}
            {locationRequired && !location && !permission.already_marked && (
              <p className="text-center text-sm text-slate-500">Location verification is required before the attendance button becomes active.</p>
            )}
          </div>

          <LocationPanel
            session={session}
            location={location}
            distanceMeters={distanceMeters}
            insideLocation={insideLocation}
            loading={locationLoading}
            error={locationError}
            onRefresh={requestLocation}
          />
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value || "--"}</p>
    </div>
  );
}

function LocationPanel({ session, location, distanceMeters, insideLocation, loading, error, onRefresh }) {
  const locationRequired = Boolean(session?.location_required);
  return (
    <aside className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="relative h-64 bg-[linear-gradient(90deg,#dbeafe_1px,transparent_1px),linear-gradient(0deg,#dbeafe_1px,transparent_1px)] bg-[size:30px_30px]">
        <div className="absolute inset-0 bg-teal-50/40" />
        <div className="absolute left-6 top-10 h-8 w-36 rotate-[-22deg] rounded-full bg-white/80" />
        <div className="absolute bottom-10 right-8 h-9 w-40 rotate-[24deg] rounded-full bg-white/80" />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <div className={`flex h-36 w-36 items-center justify-center rounded-full border-2 ${insideLocation ? "border-brand/40 bg-brand/10" : "border-red-300 bg-red-50/80"}`}>
            <div className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-soft ${insideLocation ? "bg-brand" : "bg-red-600"}`}>
              {locationRequired ? <FiMapPin size={24} /> : <FiTarget size={24} />}
            </div>
          </div>
        </div>
        {location && (
          <div className="absolute right-[22%] top-[30%] flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-soft">
            <FiNavigation size={18} />
          </div>
        )}
      </div>

      <div className="space-y-4 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">{locationRequired ? session.location_name || "Attendance location" : "Location check not required"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {locationRequired ? `Allowed radius: ${Math.round(session.radius_meters)} meters` : "This session can be marked without geofence verification."}
            </p>
          </div>
          {locationRequired && (
            <button className="btn-secondary px-3" type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh location">
              {loading ? <FiCrosshair /> : <FiRefreshCw />}
            </button>
          )}
        </div>

        {locationRequired && (
          <>
            <div className={`rounded-md px-3 py-2 text-sm font-bold ${insideLocation ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}>
              {location ? (insideLocation ? "You are inside the allowed area" : "You are outside the allowed area") : loading ? "Checking your location..." : "Waiting for your location"}
            </div>
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniInfo label="Your Lat" value={location ? location.latitude.toFixed(6) : "--"} />
              <MiniInfo label="Your Lng" value={location ? location.longitude.toFixed(6) : "--"} />
              <MiniInfo label="Distance" value={distanceMeters !== null ? `${Math.round(distanceMeters)}m` : "--"} />
            </div>
            <button className="btn-secondary w-full" type="button" onClick={onRefresh} disabled={loading}>
              <FiCrosshair /> {loading ? "Checking Location..." : "Check My Location"}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function getDistanceMeters(originLatitude, originLongitude, targetLatitude, targetLongitude) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const originLat = toRadians(originLatitude);
  const targetLat = toRadians(targetLatitude);
  const latDelta = toRadians(targetLatitude - originLatitude);
  const lngDelta = toRadians(targetLongitude - originLongitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.asin(Math.sqrt(haversine));
}
