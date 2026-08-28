import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-6 text-sm text-slate-500">Loading...</div>;
  return token ? <Outlet /> : <Navigate to="/student/login" replace />;
}
