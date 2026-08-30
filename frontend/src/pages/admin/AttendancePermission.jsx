import { useEffect, useState } from "react";
import { FiCrosshair, FiLock, FiMapPin, FiTarget, FiUnlock } from "react-icons/fi";
import api from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);

export default function AttendancePermission() {
  const [permission, setPermission] = useState(null);
  const [form, setForm] = useState({
    attendance_date: today,
    start_time: "09:00",
    end_time: "10:00",
    status: "OPEN",
    batch: "",
    section: "",
    location_name: "",
    latitude: "",
    longitude: "",
    radius_meters: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  const load = (date = form.attendance_date) =>
    api.get("/admin/attendance-permissions/today", { params: { date } }).then((res) => setPermission(res.data));

  useEffect(() => {
    load();
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api.post("/admin/attendance-permissions", {
        ...form,
        batch: form.batch || null,
        section: form.section || null,
        location_name: form.location_name || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        radius_meters: form.radius_meters || null,
      });
      setPermission(res.data);
      setMessage("Attendance permission saved");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save permission");
    }
  };

  const changeStatus = async (status) => {
    if (!permission) return;
    const action = status === "OPEN" ? "open" : "close";
    const res = await api.put(`/admin/attendance-permissions/${permission.id}/${action}`);
    setPermission(res.data);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          radius_meters: current.radius_meters || "150",
        }));
        setLocating(false);
      },
      () => {
        setError("Unable to read current location. Please allow location access or enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">Attendance Permission</h2>
        {(message || error) && (
          <div className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>
            {error || message}
          </div>
        )}
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={create}>
          <div>
            <label className="label">Attendance Date</label>
            <input
              className="field"
              type="date"
              value={form.attendance_date}
              onChange={(event) => {
                const next = event.target.value;
                setForm({ ...form, attendance_date: next });
                load(next);
              }}
              required
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
          <div>
            <label className="label">Start Time</label>
            <input className="field" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          </div>
          <div>
            <label className="label">End Time</label>
            <input className="field" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
          </div>
          <div>
            <label className="label">Batch</label>
            <input className="field" placeholder="All batches" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
          </div>
          <div>
            <label className="label">Section</label>
            <input className="field" placeholder="All sections" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">Allowed Campus Location</h3>
                  <p className="mt-1 text-xs text-slate-500">Students can mark attendance only inside this radius when coordinates are set.</p>
                </div>
                <button className="btn-secondary shrink-0" type="button" onClick={useCurrentLocation} disabled={locating}>
                  <FiCrosshair /> {locating ? "Detecting..." : "Use My Location"}
                </button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label">Location Name</label>
                    <input
                      className="field"
                      placeholder="Main campus gate, Block A, Library..."
                      value={form.location_name}
                      onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Latitude</label>
                    <input
                      className="field"
                      inputMode="decimal"
                      placeholder="Example: 28.613939"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Longitude</label>
                    <input
                      className="field"
                      inputMode="decimal"
                      placeholder="Example: 77.209023"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Radius In Meters</label>
                    <input
                      className="field"
                      inputMode="numeric"
                      placeholder="150"
                      value={form.radius_meters}
                      onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      className="btn-secondary w-full"
                      type="button"
                      onClick={() => setForm({ ...form, location_name: "", latitude: "", longitude: "", radius_meters: "" })}
                    >
                      Clear Location
                    </button>
                  </div>
                </div>
                <LocationPreview
                  latitude={form.latitude}
                  longitude={form.longitude}
                  radius={form.radius_meters}
                  locationName={form.location_name}
                />
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary">Save Attendance Permission</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">Selected Date Status</h2>
        {permission ? (
          <div className="mt-5 space-y-4">
            <div className={`rounded-lg p-4 ${permission.status === "OPEN" ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"}`}>
              <p className="text-sm font-semibold">Status</p>
              <p className="mt-1 text-3xl font-black">{permission.status}</p>
            </div>
            <Info label="Date" value={permission.attendance_date} />
            <Info label="Time" value={`${permission.start_time} - ${permission.end_time}`} />
            <Info label="Batch" value={permission.batch || "All"} />
            <Info label="Section" value={permission.section || "All"} />
            <Info label="Location" value={permission.location_required ? permission.location_name || "Restricted area" : "Not restricted"} />
            {permission.location_required && <Info label="Radius" value={`${Math.round(permission.radius_meters)} meters`} />}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={() => changeStatus("OPEN")}><FiUnlock /> Open</button>
              <button className="btn-secondary" onClick={() => changeStatus("CLOSED")}><FiLock /> Close</button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No permission exists for this date yet.</p>
        )}
      </section>
    </div>
  );
}

function LocationPreview({ latitude, longitude, radius, locationName }) {
  const hasLocation = latitude && longitude;
  return (
    <div className="min-h-64 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="relative h-44 bg-[linear-gradient(90deg,#dbeafe_1px,transparent_1px),linear-gradient(0deg,#dbeafe_1px,transparent_1px)] bg-[size:28px_28px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(20,184,166,0.20),transparent_28%),radial-gradient(circle_at_70%_65%,rgba(245,158,11,0.18),transparent_30%)]" />
        <div className="absolute left-[18%] top-8 h-7 w-28 rotate-[-18deg] rounded-full bg-white/80" />
        <div className="absolute bottom-8 right-[12%] h-8 w-36 rotate-[22deg] rounded-full bg-white/80" />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-brand/40 bg-brand/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-soft">
              {hasLocation ? <FiMapPin size={22} /> : <FiTarget size={22} />}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-sm font-bold text-ink">{hasLocation ? locationName || "Restricted attendance area" : "No location selected"}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>Lat: {latitude || "--"}</span>
          <span>Lng: {longitude || "--"}</span>
        </div>
        <p className="text-xs font-semibold text-brand">Radius: {radius || "--"} meters</p>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}
