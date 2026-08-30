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
  if (user?.role === "STUDENT")
    return <Navigate to="/student/dashboard" replace />;

  const isAdmin = role === "ADMIN";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(role, form);
      navigate(isAdmin ? "/admin/dashboard" : "/student/dashboard", {
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
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-normal text-brand">
            {isAdmin ? "Admin Portal" : "Student Portal"}
          </p>
          <h1 className="mt-2 text-3xl font-black text-ink">
            {isAdmin ? "Admin Login" : "Student Login"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to continue to the attendance system.
          </p>
        </div>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Username</label>
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
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link
            className="font-semibold text-brand"
            to={isAdmin ? "/student/login" : "/admin/login"}
          >
            {isAdmin ? "Student login" : "Admin login"}
          </Link>
          {isAdmin ? (
            <span className="text-slate-400">Password</span>
          ) : (
            <Link className="font-semibold text-brand" to="/student/register">
              Register student
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
