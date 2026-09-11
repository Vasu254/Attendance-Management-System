import { NavLink } from "react-router-dom";
import {
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiHome,
  FiUser,
  FiUsers,
  FiAward
} from "react-icons/fi";

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/admin/students", label: "Students", icon: FiUsers },
  { to: "/admin/attendance-permission", label: "Sessions", icon: FiCalendar },
  { to: "/admin/attendance-controls", label: "Controls", icon: FiClipboard },
  { to: "/admin/attendance-monitoring", label: "Attendance Monitoring", icon: FiCheckCircle },
  { to: "/admin/reports", label: "Reports", icon: FiBarChart2 },
  { to: "/admin/mock-interviews", label: "Mock Interviews", icon: FiAward },
];

const studentLinks = [
  { to: "/student/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/student/mark-attendance", label: "Mark Attendance", icon: FiCheckCircle },
  { to: "/student/attendance-history", label: "My Attendance", icon: FiClipboard },
  { to: "/student/mock-feedback", label: "Mock Feedback", icon: FiAward },
  { to: "/student/permission-requests", label: "Request Permission", icon: FiCalendar },
  { to: "/student/profile", label: "Profile", icon: FiUser },
];

const mentorLinks = [
  { to: "/mentor/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/admin/attendance-permission", label: "My Sessions", icon: FiCalendar },
  { to: "/admin/mock-interviews", label: "Mock Interviews", icon: FiAward },
];

export default function Sidebar({ role, open, onClose }) {
  const links = role === "ADMIN" ? adminLinks : role === "MENTOR" ? mentorLinks : studentLinks;
  return (
    <>
      {open && <button className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden" onClick={onClose} aria-label="Close menu" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200/80 bg-white/95 px-4 py-5 shadow-soft backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand logo */}
        <div className="mb-7 rounded-xl border border-red-100 bg-gradient-to-br from-red-50/60 to-white p-4">
          <img
            src="/logo.png"
            alt="Fullstack Experts Academy"
            className="mx-auto h-auto w-full max-w-[220px] scale-[1.4] object-contain mix-blend-multiply"
          />
          <div className="mt-3 flex justify-center">
            <div className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-600 shadow-sm ring-1 ring-red-100">
              {role === "ADMIN" ? "Admin Workspace" : role === "MENTOR" ? "Mentor Workspace" : "Student Workspace"}
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold transition ${
                  isActive ? "bg-red-600 text-white shadow-lift" : "text-slate-600 hover:bg-red-50 hover:text-red-700"
                }`
              }
            >
              <Icon className="shrink-0" size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
