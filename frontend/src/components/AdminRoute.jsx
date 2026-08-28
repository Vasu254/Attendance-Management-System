import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { token, user, loading } = useAuth();
  if (loading) return <div className="p-6 text-sm text-slate-500">Loading...</div>;
  if (!token) return <Navigate to="/admin/login" replace />;
  return user?.role === "ADMIN" ? <Outlet /> : <Navigate to="/student/dashboard" replace />;
}
