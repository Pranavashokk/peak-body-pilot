import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, PlusSquare, LogOut } from "lucide-react";
import { Toaster } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen flex">
      <Toaster theme="dark" position="top-center" />
      <aside className="w-60 border-r border-border bg-card/60 backdrop-blur hidden md:flex flex-col">
        <Link to="/" className="flex items-center gap-2 h-14 px-5 border-b border-border">
          <div className="h-6 w-6 rounded-sm bg-primary glow" />
          <span className="mono uppercase tracking-widest text-sm">Mesocycle</span>
        </Link>
        <nav className="p-3 space-y-1 flex-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Telemetry" />
          <NavItem to="/log" icon={PlusSquare} label="Log Session" />
        </nav>
        <button onClick={signOut} className="m-3 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs mono uppercase tracking-wider hover:bg-secondary">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden border-b border-border h-14 px-4 flex items-center justify-between bg-card/60">
          <Link to="/dashboard" className="mono uppercase text-sm tracking-widest">Mesocycle</Link>
          <div className="flex gap-2">
            <Link to="/dashboard" className="text-xs mono uppercase rounded border border-border px-2 py-1">Telemetry</Link>
            <Link to="/log" className="text-xs mono uppercase rounded border border-border px-2 py-1">Log</Link>
            <button onClick={signOut} className="text-xs mono uppercase rounded border border-border px-2 py-1">Out</button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary mono uppercase tracking-wider text-xs"
      activeProps={{ className: "flex items-center gap-3 rounded-md px-3 py-2 text-xs bg-secondary text-primary mono uppercase tracking-wider" }}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
