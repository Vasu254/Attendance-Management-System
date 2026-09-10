import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AdminRoute from "./components/AdminRoute";
import StudentRoute from "./components/StudentRoute";
import AdminLogin from "./pages/auth/AdminLogin";
import StudentLogin from "./pages/auth/StudentLogin";
import MentorLogin from "./pages/auth/MentorLogin";
import StudentRegister from "./pages/auth/StudentRegister";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentManagement from "./pages/admin/StudentManagement";
import AddStudent from "./pages/admin/AddStudent";
import SessionManagement from "./pages/admin/SessionManagement";
import AttendanceControls from "./pages/admin/AttendanceControls";
import AttendanceMonitoring from "./pages/admin/AttendanceMonitoring";
import Reports from "./pages/admin/Reports";
import StudentDashboard from "./pages/student/StudentDashboard";
import SessionMarkAttendance from "./pages/student/SessionMarkAttendance";
import PermissionRequests from "./pages/student/PermissionRequests";
import AttendanceHistory from "./pages/student/AttendanceHistory";
import Profile from "./pages/student/Profile";
import MentorDashboard from "./pages/mentor/MentorDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/student/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/mentor/login" element={<MentorLogin />} />
      <Route path="/student/register" element={<StudentRegister />} />
      <Route path="/student/forgot-password" element={<ForgotPassword />} />
      <Route element={<AdminRoute />}>
        <Route element={<Layout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/mentor/dashboard" element={<MentorDashboard />} />
          <Route path="/admin/students" element={<StudentManagement />} />
          <Route path="/admin/students/add" element={<AddStudent />} />
          <Route path="/admin/attendance-permission" element={<SessionManagement />} />
          <Route path="/admin/attendance-controls" element={<AttendanceControls />} />
          <Route path="/admin/attendance-monitoring" element={<AttendanceMonitoring />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>
      </Route>
      <Route element={<StudentRoute />}>
        <Route element={<Layout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/mark-attendance" element={<SessionMarkAttendance />} />
          <Route path="/student/permission-requests" element={<PermissionRequests />} />
          <Route path="/student/attendance-history" element={<AttendanceHistory />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
