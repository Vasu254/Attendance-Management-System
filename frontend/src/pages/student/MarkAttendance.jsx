import { useEffect, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function MarkAttendance() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/student/attendance/permission").then((res) => setPermission(res.data));

  useEffect(() => {
    load();
  }, []);

  const mark = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/student/attendance/mark");
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-black text-ink">Self Attendance</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Info label="Student Name" value={student?.full_name} />
          <Info label="Student ID" value={student?.student_id} />
          <Info label="Today's Date" value={today} />
          <Info label="Attendance Status" value={permission.status} />
          <Info label="Permission" value={permission.eligible ? "Eligible" : "Not eligible"} />
          <Info label="Today's Record" value={permission.already_marked ? "PRESENT" : "NOT MARKED"} />
        </div>
        {error && <div className="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
        {result && (
          <div className="mt-5 rounded-md bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
            Attendance marked successfully! Date: {result.attendance.attendance_date} Time: {result.attendance.marked_time} Status: PRESENT
          </div>
        )}
        <button className="btn-primary mt-6 w-full text-base" disabled={!permission.can_mark || loading} onClick={mark}>
          <FiCheckCircle /> {permission.already_marked ? "ATTENDANCE ALREADY MARKED TODAY" : loading ? "Marking..." : "MARK MY ATTENDANCE"}
        </button>
        {!permission.can_mark && !permission.already_marked && (
          <p className="mt-3 text-center text-sm text-slate-500">
            Attendance can be marked only while the session is open, within the allowed time, and for eligible students.
          </p>
        )}
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
