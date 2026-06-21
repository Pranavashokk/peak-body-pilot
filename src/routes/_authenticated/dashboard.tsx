import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeEngine, type SetRow, type MetricRow } from "@/lib/engine";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Award, Minus, TrendingDown, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const MUSCLES = ["chest", "back", "legs", "shoulders", "arms", "core"];

function Dashboard() {
  const sets = useQuery({
    queryKey: ["sets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("created_at,muscle_group,weight_kg,reps,rpe")
        .gte("created_at", new Date(Date.now() - 28 * 86400000).toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SetRow[];
    },
  });
  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("metric_date,bodyweight_kg,sleep_hours,subjective_readiness")
        .order("metric_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });

  const loading = sets.isLoading || metrics.isLoading;
  const engine = computeEngine(sets.data ?? [], metrics.data ?? []);
  const empty = (sets.data?.length ?? 0) === 0 && (metrics.data?.length ?? 0) === 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 hud-label">
        <span className="h-2 w-2 rounded-full bg-primary live-dot glow" /> LIVE TELEMETRY
      </div>
      <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">Control Panel</h1>
      <p className="text-muted-foreground mt-1">Rolling 28-day fatigue / fitness model.</p>

      {empty && (
        <div className="mt-6 panel p-5 border-dashed flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warn" />
          <div className="text-sm">No data yet — head to <a href="/log" className="text-primary underline">Log Session</a> to seed the engine.</div>
        </div>
      )}

      {/* Readouts */}
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Readout label="Fatigue" value={engine.fatigue} unit="" tone="warn" suffix={fatigueLabel(engine.fatigue)} />
        <Readout label="Fitness" value={engine.fitness} unit="" tone="primary" suffix="τ = 28d" />
        <Readout label="Readiness" value={engine.readiness} unit="/100" tone="accent" suffix={readinessLabel(engine.readiness)} />
        <Readout
          label="BW Trend 7d"
          value={engine.weightTrendKg}
          unit=" kg"
          tone={engine.weightTrendKg < 0 ? "warn" : engine.weightTrendKg > 0 ? "primary" : "muted"}
          suffix=""
          icon={engine.weightTrendKg < 0 ? TrendingDown : engine.weightTrendKg > 0 ? TrendingUp : Minus}
        />
      </div>

      {/* Recommendation */}
      <div className="mt-8 panel p-6 glow">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="hud-label flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> ENGINE DIRECTIVE
          </div>
          <span className={`text-xs mono uppercase tracking-wider px-2 py-1 rounded border ${actionStyle(engine.recommendation.action)}`}>
            {engine.recommendation.action.replace("_", " ")}
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{engine.recommendation.title}</h2>
        <p className="mt-2 text-muted-foreground">{engine.recommendation.detail}</p>
        <div className="mt-4 text-sm mono">
          <span className="hud-label">SPLIT // </span>
          <span className="text-foreground">{engine.recommendation.splitSuggestion}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-8 panel p-6">
        <div className="hud-label">28-DAY MODEL</div>
        <div className="h-72 mt-3">
          <ResponsiveContainer>
            <AreaChart data={engine.series}>
              <defs>
                <linearGradient id="fat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.17 80)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.82 0.17 80)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.86 0.22 155)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.86 0.22 155)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 12 }}
                labelStyle={{ color: "var(--color-muted-foreground)" }}
              />
              <Area type="monotone" dataKey="fatigue" stroke="oklch(0.82 0.17 80)" fill="url(#fat)" strokeWidth={2} />
              <Area type="monotone" dataKey="fitness" stroke="oklch(0.86 0.22 155)" fill="url(#fit)" strokeWidth={2} />
              <Area type="monotone" dataKey="readiness" stroke="oklch(0.7 0.17 220)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <Legend />
      </div>

      {/* Weekly volume */}
      <div className="mt-8 panel p-6">
        <div className="hud-label">WEEKLY VOLUME · SETS BY MUSCLE</div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          {MUSCLES.map((m) => {
            const v = engine.weeklyVolume[m] || 0;
            const tone = v < 8 ? "text-muted-foreground" : v > 22 ? "text-warn" : "text-primary";
            return (
              <div key={m} className="rounded border border-border p-3 bg-background/40">
                <div className="hud-label">{m}</div>
                <div className={`mt-1 mono text-2xl ${tone}`}>{v}</div>
                <div className="text-[10px] mono uppercase text-muted-foreground">{v < 8 ? "low" : v > 22 ? "overload" : "in range"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="mt-4 text-xs mono text-muted-foreground">SYNC…</div>}
    </div>
  );
}

function Readout({ label, value, unit, tone, suffix, icon: Icon }: { label: string; value: number; unit: string; tone: "primary" | "accent" | "warn" | "muted"; suffix: string; icon?: React.ComponentType<{ className?: string }> }) {
  const colorClass = tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : "text-muted-foreground";
  return (
    <div className="panel p-5">
      <div className="hud-label flex items-center gap-1.5">{Icon && <Icon className="h-3 w-3" />}{label}</div>
      <div className={`mt-2 mono text-4xl ${colorClass}`}>{value}{unit}</div>
      <div className="mt-1 text-[11px] mono uppercase tracking-wider text-muted-foreground">{suffix}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs mono uppercase tracking-wider text-muted-foreground">
      <span className="flex items-center gap-2"><i className="h-2 w-4 rounded-sm" style={{background:"oklch(0.82 0.17 80)"}}/>Fatigue</span>
      <span className="flex items-center gap-2"><i className="h-2 w-4 rounded-sm" style={{background:"oklch(0.86 0.22 155)"}}/>Fitness</span>
      <span className="flex items-center gap-2"><i className="h-2 w-4 rounded-sm" style={{background:"oklch(0.7 0.17 220)"}}/>Readiness</span>
    </div>
  );
}

const fatigueLabel = (v: number) => v >= 70 ? "CRITICAL" : v >= 50 ? "ELEVATED" : v >= 25 ? "NOMINAL" : "LOW";
const readinessLabel = (v: number) => v >= 75 ? "GREEN" : v >= 55 ? "AMBER" : "RED";
const actionStyle = (a: string) => {
  switch (a) {
    case "PR_ATTEMPT": return "border-primary text-primary";
    case "PUSH":       return "border-accent text-accent";
    case "DELOAD":     return "border-warn text-warn";
    case "MACRO_ADJUST": return "border-destructive text-destructive";
    default:           return "border-border text-muted-foreground";
  }
};
