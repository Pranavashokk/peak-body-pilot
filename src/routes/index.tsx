import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Cpu, Gauge, LineChart, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MESOCYCLE // Predictive Hypertrophy Engine" },
      { name: "description", content: "Treats the body like a control system. Models fatigue and prescribes when to PR, push, or deload." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-28">
        <div className="flex items-center gap-2 hud-label">
          <span className="inline-block h-2 w-2 rounded-full bg-primary live-dot glow" />
          SYSTEM ONLINE · v0.1
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight max-w-4xl">
          Treat the lifter like a <span className="text-primary">control system</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Mesocycle ingests precise training volume, relative intensity, and daily bodyweight to model
          systemic fatigue and recoverability in real time — then prescribes exactly when to push for a PR,
          deload, or adjust macros to protect muscle tissue.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground glow hover:opacity-90 mono uppercase tracking-wider">
            <Zap className="h-4 w-4" /> Initialize Engine
          </Link>
          <a href="#engine" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-secondary mono uppercase tracking-wider">
            View Telemetry
          </a>
        </div>

        <ReadoutPreview />
      </section>

      <section id="engine" className="border-t border-border bg-background/60">
        <div className="mx-auto max-w-7xl px-6 py-24 grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <div className="hud-label mt-4">{f.kicker}</div>
              <h3 className="mt-1 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="hud-label">READOUT</div>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold">Every recommendation, traced to a number.</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            No vibes-based programming. Every training prescription is derived from a transparent
            fatigue / fitness ratio, weighted set volume, RPE-adjusted load, and your 7-day bodyweight delta.
          </p>
          <Link to="/auth" className="mt-10 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground glow hover:opacity-90 mono uppercase tracking-wider">
            <Zap className="h-4 w-4" /> Sign in to begin
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between text-xs mono uppercase tracking-wider text-muted-foreground">
          <span>MESOCYCLE // ENGINE v0.1</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-primary glow" />
          <span className="mono uppercase tracking-widest text-sm">Mesocycle</span>
        </Link>
        <Link to="/auth" className="rounded-md border border-border px-4 py-1.5 text-xs mono uppercase tracking-wider hover:bg-secondary">
          Sign in
        </Link>
      </div>
    </header>
  );
}

const features = [
  {
    icon: Activity,
    kicker: "MODULE 01",
    title: "Fatigue Modeling",
    body: "Banister-style impulse model: every set contributes weighted load that decays through two time constants — fast fatigue (τ=4d) and slow fitness (τ=28d).",
  },
  {
    icon: Gauge,
    kicker: "MODULE 02",
    title: "Readiness Scoring",
    body: "Real-time readiness = fitness minus fatigue, cross-validated against your subjective score and 7-day bodyweight trend.",
  },
  {
    icon: LineChart,
    kicker: "MODULE 03",
    title: "Adaptive Prescription",
    body: "The engine outputs a single directive: PR window, push volume, hold, deload, or macro adjustment — with split and RPE targets.",
  },
];

function ReadoutPreview() {
  return (
    <div className="mt-16 grid md:grid-cols-3 gap-4">
      <div className="panel p-5">
        <div className="hud-label">FATIGUE</div>
        <div className="mt-2 mono text-4xl text-foreground">62.4</div>
        <div className="mt-1 text-xs text-warn mono">▲ +8.1 / 7d</div>
      </div>
      <div className="panel p-5">
        <div className="hud-label">FITNESS</div>
        <div className="mt-2 mono text-4xl text-primary">71.0</div>
        <div className="mt-1 text-xs mono text-muted-foreground">τ = 28d</div>
      </div>
      <div className="panel p-5">
        <div className="hud-label">READINESS</div>
        <div className="mt-2 mono text-4xl text-accent">78</div>
        <div className="mt-1 text-xs mono text-primary">GREEN · PR WINDOW</div>
      </div>
    </div>
  );
}
