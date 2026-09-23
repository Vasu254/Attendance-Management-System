import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiUserPlus } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const blank = {
  full_name: "",
  student_id: "",
  email: "",
  batch: "",
  password: "",
  confirm_password: "",
};

export default function StudentRegister() {
  const { registerStudent, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === "STUDENT") return <Navigate to="/student/dashboard" replace />;

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { confirm_password, ...payload } = form;
      await registerStudent(payload);
      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to register student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-panel px-4 py-8 sm:py-10">
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-soft">
        <div className="border-b border-slate-100 bg-gradient-to-r from-red-50/60 to-white px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between overflow-hidden">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Fullstack Experts Academy" className="h-16 w-auto shrink-0 scale-[1.5] object-contain mix-blend-multiply" />
              <h1 className="text-xl font-black text-ink sm:text-2xl">Student Register</h1>
            </div>
            <Link className="btn-secondary shrink-0" to="/student/login">
              <FiArrowLeft /> Login
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={submit}>
            <Input label="Full Name" placeholder="e.g. Rahul Sharma" value={form.full_name} onChange={(value) => update("full_name", value)} />
            <Input label="Enrollment Number" placeholder="e.g. FS202601" value={form.student_id} onChange={(value) => update("student_id", value)} />
            <Input label="Email Address" type="email" placeholder="student@example.com" value={form.email} onChange={(value) => update("email", value)} />
            <Input label="Batch Number" placeholder="e.g. BATCH-24" value={form.batch} onChange={(value) => update("batch", value)} />
            <Input label="Password" type="password" placeholder="At least 6 characters" value={form.password} onChange={(value) => update("password", value)} />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={form.confirm_password}
              onChange={(value) => update("confirm_password", value)}
            />
            <button className="btn-primary w-full" disabled={loading}>
              <FiUserPlus /> {loading ? "Registering..." : "Register Student"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}
