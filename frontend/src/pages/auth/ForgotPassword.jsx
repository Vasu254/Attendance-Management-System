import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FiArrowLeft, FiKey } from "react-icons/fi";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPassword() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    email: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === "STUDENT") return <Navigate to="/student/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.new_password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/student/forgot-password", form);
      setSuccess(res.data.message);
      setForm({ email: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-soft">
        <div className="border-b border-slate-100 bg-gradient-to-r from-red-50/60 to-white px-6 py-5">
          <div className="flex flex-col items-center gap-2 overflow-hidden">
            <img src="/logo.png" alt="Fullstack Experts Academy" className="h-auto w-full max-w-[280px] scale-[1.5] object-contain mix-blend-multiply" />
            <p className="mt-2 text-sm font-semibold text-slate-500">Reset Password</p>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="mt-2 text-3xl font-black text-ink">Forgot Password</h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your registered Email to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700">
              {success}
            </div>
          )}

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="label">Registered Email</label>
              <input
                className="field"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                className="field"
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                className="field"
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              <FiKey /> {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link className="text-sm font-semibold text-brand" to="/student/login">
              <FiArrowLeft className="mr-1 inline" /> Back to Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
