import { FiLogOut, FiMenu } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ title, onMenu }) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button className="btn-secondary px-3 lg:hidden" onClick={onMenu} aria-label="Open menu" title="Open menu">
            <FiMenu />
          </button>
          <img src="/logo.png" alt="Fullstack Experts Academy" className="hidden h-9 w-auto shrink-0 object-contain sm:block" />
          <div className="min-w-0">
            <p className="truncate text-xl font-black text-ink">{title}</p>
            <p className="truncate text-xs font-semibold uppercase tracking-normal text-slate-500">
              {user?.role === "ADMIN" ? "Administrator" : user?.role === "MENTOR" ? "Mentor" : "Student"} / {user?.username}
            </p>
          </div>
        </div>
        <button className="btn-secondary shrink-0" onClick={logout}>
          <FiLogOut /> Logout
        </button>
      </div>
    </header>
  );
}
