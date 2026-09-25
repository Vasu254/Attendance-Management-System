import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiCrosshair, FiMapPin, FiRefreshCw } from "react-icons/fi";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import GoogleMapGeofence from "../../components/GoogleMapGeofence";

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

  if (!permission) return <p className="text-sm text-slate-500 p-6">Loading attendance status...</p>;

  const student = user?.student;
  const today = new Date().toISOString().slice(0, 10);
  const session = permission.permission;
  const locationRequired = Boolean(session?.location_required);
  const distanceMeters = locationRequired && location ? getDistanceMeters(session.latitude, session.longitude, location.latitude, location.longitude) : null;
  const maxRadius = session?.radius_meters || 300;
  const insideLocation = !locationRequired || (distanceMeters !== null && distanceMeters <= maxRadius);
  const canSubmit = permission.can_mark && (!locationRequired || (location && insideLocation)) && !loading;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-ink">Self Attendance</h2>
            <p className="mt-1 text-sm text-slate-500">Google Maps location restriction up to {maxRadius}m radius</p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${permission.can_mark ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}>
            {permission.can_mark ? <FiCheckCircle /> : <FiAlertCircle />} {permission.can_mark ? "Ready" : "Not Ready"}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_450px]">
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

            <button className="btn-primary w-full text-base py-3" disabled={!canSubmit} onClick={mark}>
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
  const maxRadius = session?.radius_meters || 300;

  return (
    <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white space-y-3">
      {locationRequired && (
        <GoogleMapGeofence
          mode="viewer"
          latitude={session.latitude}
          longitude={session.longitude}
          radiusMeters={maxRadius}
          locationName={session.location_name}
          studentLatitude={location?.latitude}
          studentLongitude={location?.longitude}
        />
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">{locationRequired ? session.location_name || "Attendance location" : "Location check not required"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {locationRequired ? `Allowed radius: ${Math.round(maxRadius)} meters on Google Maps` : "This session can be marked without geofence verification."}
            </p>
          </div>
          {locationRequired && (
            <button className="btn-secondary px-3 shrink-0" type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh location">
              {loading ? <FiCrosshair /> : <FiRefreshCw />}
            </button>
          )}
        </div>

        {locationRequired && (
          <>
            <div className={`rounded-md px-3 py-2 text-sm font-bold ${insideLocation ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}>
              {location ? (insideLocation ? `🟢 Inside 300m radius area (${Math.round(distanceMeters)}m away)` : `🔴 Outside allowed area (${Math.round(distanceMeters)}m away - max ${maxRadius}m)`) : loading ? "Checking your GPS location..." : "Waiting for GPS position"}
            </div>
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
            <div className="grid gap-2 sm:grid-cols-3">
              <MiniInfo label="Your Lat" value={location ? location.latitude.toFixed(6) : "--"} />
              <MiniInfo label="Your Lng" value={location ? location.longitude.toFixed(6) : "--"} />
              <MiniInfo label="Distance" value={distanceMeters !== null ? `${Math.round(distanceMeters)}m` : "--"} />
            </div>
            <button className="btn-secondary w-full" type="button" onClick={onRefresh} disabled={loading}>
              <FiCrosshair /> {loading ? "Acquiring GPS Position..." : "Verify GPS Location"}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-xs font-mono font-bold text-ink">{value}</p>
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
