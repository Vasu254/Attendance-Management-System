import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FiLogIn } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

export default function LoginShell({ role }) {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === "MENTOR") return <Navigate to="/mentor/dashboard" replace />;
  if (user?.role === "STUDENT")
    return <Navigate to="/student/dashboard" replace />;

  const isAdmin = role === "ADMIN";
  const isMentor = role === "MENTOR";
  const portalLabel = isAdmin ? "Admin" : isMentor ? "Mentor" : "Student";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(role, form);
      navigate(isAdmin ? "/admin/dashboard" : isMentor ? "/mentor/dashboard" : "/student/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to login");
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
            <p className="mt-2 text-sm font-semibold text-slate-500">{portalLabel} Portal</p>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="mt-2 text-3xl font-black text-ink">
              {portalLabel} Login
            </h1>
          </div>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="label">{isAdmin || isMentor ? "Username" : "Enrollment ID"}</label>
              <input
                className="field"
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="field"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              <FiLogIn /> {loading ? "Signing in..." : "Login"}
            </button>
          </form>
          {!isAdmin && !isMentor && (
            <div className="mt-4 text-center">
              <Link className="text-sm font-semibold text-brand" to="/student/forgot-password">
                Forgot Password?
              </Link>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link
              className="font-semibold text-brand"
              to={isAdmin ? "/student/login" : "/admin/login"}
            >
              {isAdmin ? "Student login" : "Admin login"}
            </Link>
            {isAdmin || isMentor ? (
              <span className="font-semibold text-slate-400">Secure access</span>
            ) : (
              <Link className="font-semibold text-brand" to="/student/register">
                Register student
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
