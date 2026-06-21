import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/log")({
  component: LogPage,
});

type DraftSet = { exercise: string; muscle_group: string; weight_kg: string; reps: string; rpe: string };

const MUSCLES = ["chest", "back", "legs", "shoulders", "arms", "core"];
const SPLITS = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Other"];

function LogPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  // Daily metrics
  const [bw, setBw] = useState("");
  const [sleep, setSleep] = useState("");
  const [readiness, setReadiness] = useState("7");
  // Session
  const [split, setSplit] = useState("Push");
  const [sets, setSets] = useState<DraftSet[]>([
    { exercise: "Bench Press", muscle_group: "chest", weight_kg: "", reps: "", rpe: "8" },
  ]);

  const addSet = () => setSets([...sets, { exercise: "", muscle_group: "chest", weight_kg: "", reps: "", rpe: "8" }]);
  const removeSet = (i: number) => setSets(sets.filter((_, idx) => idx !== i));
  const update = (i: number, k: keyof DraftSet, v: string) =>
    setSets(sets.map((s, idx) => idx === i ? { ...s, [k]: v } : s));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not signed in");

      // Upsert today's metrics if filled
      if (bw || sleep || readiness) {
        const today = new Date().toISOString().slice(0, 10);
        const { error } = await supabase.from("daily_metrics").upsert({
          user_id: uid,
          metric_date: today,
          bodyweight_kg: bw ? Number(bw) : null,
          sleep_hours: sleep ? Number(sleep) : null,
          subjective_readiness: readiness ? Number(readiness) : null,
        }, { onConflict: "user_id,metric_date" });
        if (error) throw error;
      }

      // Create session
      const validSets = sets.filter(s => s.exercise && s.reps && s.weight_kg);
      if (validSets.length > 0) {
        const { data: session, error: sErr } = await supabase
          .from("workout_sessions")
          .insert({ user_id: uid, split }).select("id").single();
        if (sErr) throw sErr;

        const rows = validSets.map((s, i) => ({
          session_id: session!.id,
          user_id: uid,
          exercise: s.exercise,
          muscle_group: s.muscle_group,
          weight_kg: Number(s.weight_kg),
          reps: Number(s.reps),
          rpe: s.rpe ? Number(s.rpe) : null,
          set_index: i + 1,
        }));
        const { error: setErr } = await supabase.from("workout_sets").insert(rows);
        if (setErr) throw setErr;
      }

      toast.success("Telemetry committed.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="hud-label">INPUT MODULE</div>
      <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">Log Session</h1>
      <p className="text-muted-foreground mt-1">Daily bodyweight + training data feeds the engine.</p>

      <form onSubmit={submit} className="mt-8 space-y-8">
        <div className="panel p-6">
          <div className="hud-label">DAILY METRICS</div>
          <div className="mt-4 grid sm:grid-cols-3 gap-4">
            <NumField label="Bodyweight (kg)" value={bw} onChange={setBw} step="0.1" placeholder="82.4" />
            <NumField label="Sleep (hrs)" value={sleep} onChange={setSleep} step="0.25" placeholder="7.5" />
            <NumField label="Readiness 1-10" value={readiness} onChange={setReadiness} step="1" placeholder="7" />
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="hud-label">TRAINING SESSION</div>
            <select value={split} onChange={(e) => setSplit(e.target.value)} className="bg-input border border-border rounded-md px-3 py-1.5 text-sm mono">
              {SPLITS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="mt-5 space-y-2">
            <div className="grid grid-cols-12 gap-2 hud-label px-1 hidden md:grid">
              <div className="col-span-4">Exercise</div>
              <div className="col-span-2">Muscle</div>
              <div className="col-span-2">Weight kg</div>
              <div className="col-span-1">Reps</div>
              <div className="col-span-2">RPE</div>
              <div className="col-span-1" />
            </div>
            {sets.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input className="input col-span-12 md:col-span-4" placeholder="Exercise" value={s.exercise} onChange={(e) => update(i, "exercise", e.target.value)} />
                <select className="input col-span-6 md:col-span-2 mono" value={s.muscle_group} onChange={(e) => update(i, "muscle_group", e.target.value)}>
                  {MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input className="input col-span-6 md:col-span-2 mono" type="number" step="0.5" placeholder="kg" value={s.weight_kg} onChange={(e) => update(i, "weight_kg", e.target.value)} />
                <input className="input col-span-4 md:col-span-1 mono" type="number" placeholder="reps" value={s.reps} onChange={(e) => update(i, "reps", e.target.value)} />
                <input className="input col-span-4 md:col-span-2 mono" type="number" step="0.5" min="1" max="10" placeholder="RPE" value={s.rpe} onChange={(e) => update(i, "rpe", e.target.value)} />
                <button type="button" onClick={() => removeSet(i)} className="col-span-4 md:col-span-1 inline-flex justify-center items-center text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addSet} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs mono uppercase hover:bg-secondary">
            <Plus className="h-3.5 w-3.5" /> Add Set
          </button>
        </div>

        <button disabled={busy} className="w-full md:w-auto rounded-md bg-primary text-primary-foreground glow px-8 py-3 mono uppercase tracking-wider text-sm disabled:opacity-50">
          {busy ? "Committing…" : "Commit to Engine"}
        </button>
      </form>

      <style>{`.input{width:100%;background:var(--color-input);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.55rem 0.75rem;font-size:0.875rem;color:var(--color-foreground);outline:none}.input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-primary) 25%,transparent)}`}</style>
    </div>
  );
}

function NumField({ label, value, onChange, step, placeholder }: { label: string; value: string; onChange: (v: string) => void; step: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="hud-label">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input mono mt-1" />
    </label>
  );
}
