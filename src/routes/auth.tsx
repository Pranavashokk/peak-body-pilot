import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Toaster } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authenticate · Mesocycle" },
      { name: "description", content: "Sign in or create an account to access the predictive hypertrophy engine." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account initialized. Check your email if confirmation is required.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) { toast.error(res.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Toaster theme="dark" position="top-center" />
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-6 w-6 rounded-sm bg-primary glow" />
          <span className="mono uppercase tracking-widest text-sm">Mesocycle</span>
        </Link>
        <div className="panel p-8 glow">
          <div className="hud-label">{mode === "signin" ? "AUTH · INITIATE" : "AUTH · REGISTER"}</div>
          <h1 className="mt-2 text-2xl font-semibold">
            {mode === "signin" ? "Access the engine" : "Create operator profile"}
          </h1>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="mt-6 w-full rounded-md border border-border bg-secondary py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs mono uppercase text-muted-foreground">
            <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Operator name">
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Alex" />
              </Field>
            )}
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mono" placeholder="you@domain.com" />
            </Field>
            <Field label="Password">
              <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mono" placeholder="••••••••" />
            </Field>
            <button type="submit" disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground glow hover:opacity-90 mono uppercase tracking-wider disabled:opacity-50">
              {busy ? "Processing…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 w-full text-center text-xs mono uppercase tracking-wider text-muted-foreground hover:text-primary"
          >
            {mode === "signin" ? "No account? Register operator →" : "← Back to sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="hud-label">{label}</span>
      <div className="mt-1">{children}</div>
      <style>{`.input{width:100%;background:var(--color-input);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.55rem 0.75rem;font-size:0.9rem;color:var(--color-foreground);outline:none}.input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-primary) 25%,transparent)}`}</style>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34.6 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.5 5.5C41.4 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
  );
}
