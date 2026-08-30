import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiUserPlus } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const blank = {
  student_id: "",
  full_name: "",
  email: "",
  mobile_number: "",
  course: "",
  batch: "",
  section: "",
  username: "",
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
    setForm((current) => ({
      ...current,
      [field]: value,
      username: field === "student_id" && current.username === current.student_id ? value : current.username,
    }));
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
      <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-soft">
        <div className="border-b border-slate-100 bg-teal-50/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-brand text-lg font-black text-white shadow-lift">
                A
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-teal-700">Student Portal</p>
                <h1 className="text-2xl font-black text-ink sm:text-3xl">Student Register</h1>
              </div>
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

          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <Input label="Student ID" value={form.student_id} onChange={(value) => update("student_id", value)} />
            <Input label="Full Name" value={form.full_name} onChange={(value) => update("full_name", value)} />
            <Input label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
            <Input label="Mobile Number" type="tel" value={form.mobile_number} onChange={(value) => update("mobile_number", value)} />
            <Input label="Course" value={form.course} onChange={(value) => update("course", value)} />
            <Input label="Batch" value={form.batch} onChange={(value) => update("batch", value)} />
            <Input label="Section" value={form.section} onChange={(value) => update("section", value)} />
            <Input label="Login Username" value={form.username} onChange={(value) => update("username", value)} />
            <Input label="Password" type="password" value={form.password} onChange={(value) => update("password", value)} />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirm_password}
              onChange={(value) => update("confirm_password", value)}
            />
            <div className="md:col-span-2">
              <button className="btn-primary w-full sm:w-auto" disabled={loading}>
                <FiUserPlus /> {loading ? "Registering..." : "Register Student"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </div>
  );
}
