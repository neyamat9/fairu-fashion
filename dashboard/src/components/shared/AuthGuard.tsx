import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/store/auth";

export function ProtectedRoute() {
  const user = useAuth((s) => s.user);
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const user = useAuth((s) => s.user);
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
