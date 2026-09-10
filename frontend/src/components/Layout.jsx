import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const titles = {
  "/admin/dashboard": "Admin Dashboard",
  "/mentor/dashboard": "Mentor Dashboard",
  "/admin/students": "Student Management",
  "/admin/attendance-permission": "Session Management",
  "/admin/attendance-controls": "Attendance Controls",
  "/admin/attendance-monitoring": "Attendance Monitoring",
  "/admin/reports": "Attendance Reports",
  "/student/dashboard": "Student Dashboard",
  "/student/mark-attendance": "Mark Attendance",
  "/student/permission-requests": "Permission Requests",
  "/student/attendance-history": "Attendance History",
  "/student/profile": "Profile",
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell min-h-screen lg:flex">
      <Sidebar role={user?.role} open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1">
        <Navbar title={titles[location.pathname] || "Attendance System"} onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
