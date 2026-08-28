import { FiLogOut, FiMenu } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ title, onMenu }) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button className="btn-secondary px-3 lg:hidden" onClick={onMenu} aria-label="Open menu">
            <FiMenu />
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-ink">{title}</p>
            <p className="truncate text-xs text-slate-500">{user?.username}</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={logout}>
          <FiLogOut /> Logout
        </button>
      </div>
    </header>
  );
}
