import { useEffect, useState } from "react";
import { FiLock, FiUnlock } from "react-icons/fi";
import api from "../../api/axios";
import GoogleMapGeofence from "../../components/GoogleMapGeofence";

const today = new Date().toISOString().slice(0, 10);
const nowHour = new Date().getHours();
const pad = (n) => String(n).padStart(2, "0");
const defaultStart = `${pad(nowHour)}:00`;
const defaultEnd = `${pad((nowHour + 2) % 24)}:00`;

export default function AttendancePermission() {
  const [permission, setPermission] = useState(null);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({
    attendance_date: today,
    start_time: defaultStart,
    end_time: defaultEnd,
    status: "OPEN",
    batch: "",
    section: "",
    location_name: "",
    latitude: "",
    longitude: "",
    radius_meters: "300",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = (date = form.attendance_date) =>
    api.get("/admin/attendance-permissions/today", { params: { date } }).then((res) => setPermission(res.data));

  useEffect(() => {
    load();
    api.get("/admin/students/filters").then((res) => {
      if (res.data?.batches) setBatches(res.data.batches);
    }).catch(() => {});
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
        radius_meters: form.radius_meters || "300",
      });
      setPermission(res.data);
      setMessage("Attendance permission saved with Google Maps 300m radius geofence");
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="surface p-5 space-y-5">
        <h2 className="text-lg font-black text-ink">Attendance Permission</h2>
        {(message || error) && (
          <div className={`rounded-md px-3 py-2 text-sm font-medium ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>
            {error || message}
          </div>
        )}
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={create}>
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
            <input
              className="field"
              list="batch-options"
              placeholder="All batches (e.g. 64)"
              value={form.batch}
              onChange={(e) => setForm({ ...form, batch: e.target.value })}
            />
            <datalist id="batch-options">
              {batches.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Section</label>
            <input className="field" placeholder="All sections" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          </div>

          <div className="sm:col-span-2 space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Google Maps Allowed Location (300m Radius)</h3>
                <p className="text-xs text-slate-500">Pick classroom/campus location on Google Maps with up to 300 meters restriction radius.</p>
              </div>
              <button
                className="btn-secondary text-xs"
                type="button"
                onClick={() => setForm({ ...form, location_name: "", latitude: "", longitude: "", radius_meters: "300" })}
              >
                Clear Location
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>

            <GoogleMapGeofence
              mode="picker"
              latitude={form.latitude}
              longitude={form.longitude}
              radiusMeters={form.radius_meters}
              locationName={form.location_name}
              onChange={(loc) =>
                setForm((prev) => ({
                  ...prev,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  radius_meters: loc.radius_meters,
                  location_name: loc.location_name,
                }))
              }
            />
          </div>

          <div className="sm:col-span-2">
            <button className="btn-primary w-full">Save Attendance Permission</button>
          </div>
        </form>
      </section>

      <section className="surface p-5">
        <h2 className="text-lg font-black text-ink">Selected Date Status</h2>
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

function Info({ label, value }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}
