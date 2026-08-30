import { NavLink } from "react-router-dom";
import {
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiHome,
  FiUser,
  FiUsers,
} from "react-icons/fi";

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/admin/students", label: "Students", icon: FiUsers },
  { to: "/admin/attendance-permission", label: "Attendance Permission", icon: FiCalendar },
  { to: "/admin/attendance-monitoring", label: "Attendance Monitoring", icon: FiCheckCircle },
  { to: "/admin/reports", label: "Reports", icon: FiBarChart2 },
];

const studentLinks = [
  { to: "/student/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/student/mark-attendance", label: "Mark Attendance", icon: FiCheckCircle },
  { to: "/student/attendance-history", label: "My Attendance", icon: FiClipboard },
  { to: "/student/profile", label: "Profile", icon: FiUser },
];

export default function Sidebar({ role, open, onClose }) {
  const links = role === "ADMIN" ? adminLinks : studentLinks;
  return (
    <>
      {open && <button className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden" onClick={onClose} aria-label="Close menu" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200/80 bg-white/95 px-4 py-5 shadow-soft backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 rounded-lg border border-teal-100 bg-teal-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-brand text-base font-black text-white shadow-lift">
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black text-ink">Attendly</p>
              <p className="truncate text-sm font-medium text-teal-700">Student Attendance</p>
            </div>
          </div>
          <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-normal text-brand shadow-sm">
            {role === "ADMIN" ? "Admin Workspace" : "Student Workspace"}
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
                  isActive ? "bg-brand text-white shadow-lift" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
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
