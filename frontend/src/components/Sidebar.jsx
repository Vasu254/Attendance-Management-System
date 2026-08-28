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
      {open && <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} aria-label="Close menu" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8">
          <p className="text-xl font-black text-ink">Attendly</p>
          <p className="text-sm text-slate-500">Student Attendance</p>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                  isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
