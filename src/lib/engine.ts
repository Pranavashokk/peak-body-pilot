// Predictive Hypertrophy & Fatigue Engine
// Treat the lifter as a control system: training input -> fatigue state -> recovery -> readiness.

export type SetRow = {
  created_at: string;
  muscle_group: string;
  weight_kg: number;
  reps: number;
  rpe: number | null;
};

export type MetricRow = {
  metric_date: string;
  bodyweight_kg: number | null;
  sleep_hours: number | null;
  subjective_readiness: number | null;
};

// Effective volume = sets x reps x weight x intensity-from-RPE multiplier
// Stimulus = effort load weighted toward higher RPE
const rpeMultiplier = (rpe: number | null) => {
  if (rpe == null) return 0.85;
  // RPE 6 -> 0.75, RPE 10 -> 1.0
  return Math.min(1, Math.max(0.6, 0.5 + rpe * 0.05));
};

export const setLoad = (s: SetRow) =>
  Math.max(0, s.weight_kg) * Math.max(0, s.reps) * rpeMultiplier(s.rpe);

// Exponentially weighted "fatigue" and "fitness" — Banister-style with our own constants
export type EngineState = {
  fatigue: number;          // 0..100
  fitness: number;          // 0..100
  readiness: number;        // 0..100 (fitness - fatigue, normalized)
  weightTrendKg: number;    // 7d vs 14d avg
  recommendation: Recommendation;
  weeklyVolume: Record<string, number>;
  series: { date: string; fatigue: number; fitness: number; readiness: number }[];
};

export type Recommendation = {
  action: "PR_ATTEMPT" | "PUSH" | "MAINTAIN" | "DELOAD" | "MACRO_ADJUST";
  title: string;
  detail: string;
  splitSuggestion: string;
};

const FAT_TAU = 4;   // days — fatigue decays fast
const FIT_TAU = 28;  // days — fitness decays slowly
const STIM_DIVISOR = 1500; // scale load -> 0..~1 daily impulse

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function computeEngine(sets: SetRow[], metrics: MetricRow[]): EngineState {
  const today = new Date();
  const days = 28;
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);

  // Build daily impulse
  const impulse: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    impulse[dayKey(d)] = 0;
  }
  for (const s of sets) {
    const k = s.created_at.slice(0, 10);
    if (k in impulse) impulse[k] += setLoad(s) / STIM_DIVISOR;
  }

  // Weekly volume per muscle group (last 7d)
  const weeklyVolume: Record<string, number> = {};
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  for (const s of sets) {
    if (new Date(s.created_at) >= weekAgo) {
      weeklyVolume[s.muscle_group] = (weeklyVolume[s.muscle_group] || 0) + 1;
    }
  }

  // Iterate EWMA
  let fatigue = 0, fitness = 0;
  const series: EngineState["series"] = [];
  const keys = Object.keys(impulse).sort();
  for (const k of keys) {
    const imp = impulse[k];
    fatigue = fatigue + (imp - fatigue / FAT_TAU);
    fitness = fitness + (imp - fitness / FIT_TAU);
    const readiness = clamp(50 + (fitness - fatigue) * 25, 0, 100);
    series.push({
      date: k,
      fatigue: round(clamp(fatigue * 25, 0, 100)),
      fitness: round(clamp(fitness * 25, 0, 100)),
      readiness: round(readiness),
    });
  }
  const last = series[series.length - 1] ?? { fatigue: 0, fitness: 0, readiness: 50, date: dayKey(today) };

  // Bodyweight trend
  const sortedM = [...metrics].filter(m => m.bodyweight_kg != null).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  const recent = sortedM.slice(-7).map(m => Number(m.bodyweight_kg));
  const prior = sortedM.slice(-14, -7).map(m => Number(m.bodyweight_kg));
  const avg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const weightTrendKg = recent.length && prior.length ? round(avg(recent) - avg(prior), 2) : 0;

  // Subjective adjustment
  const recentReadiness = metrics.slice(-3).map(m => m.subjective_readiness).filter((x): x is number => x != null);
  const subjective = recentReadiness.length ? avg(recentReadiness as unknown as number[]) : null;

  const recommendation = recommend(last.fatigue, last.fitness, last.readiness, weightTrendKg, subjective);
  return {
    fatigue: last.fatigue,
    fitness: last.fitness,
    readiness: last.readiness,
    weightTrendKg,
    recommendation,
    weeklyVolume,
    series,
  };
}

function recommend(fatigue: number, fitness: number, readiness: number, weightTrendKg: number, subjective: number | null): Recommendation {
  // Macro adjust if weight dropped sharply while training hard -> muscle loss risk
  if (weightTrendKg <= -0.7 && fatigue > 40) {
    return {
      action: "MACRO_ADJUST",
      title: "Macro Adjustment Required",
      detail: `Bodyweight down ${weightTrendKg.toFixed(2)} kg over 7d while systemic fatigue is elevated. Raise calories +200–300 kcal/day or risk losing tissue.`,
      splitSuggestion: "Hold current split. Prioritize sleep and protein 1.8 g/kg.",
    };
  }
  if (fatigue >= 70 || (subjective != null && subjective <= 3 && fatigue > 50)) {
    return {
      action: "DELOAD",
      title: "Deload Window",
      detail: "Systemic fatigue exceeds recovery capacity. Reduce volume 40–50% and intensity by one RPE for 5–7 days.",
      splitSuggestion: "Full-body x2, ~6 sets/muscle, RPE 6.",
    };
  }
  if (readiness >= 75 && fitness >= 55 && fatigue <= 45) {
    return {
      action: "PR_ATTEMPT",
      title: "Green Light — PR Window",
      detail: "Fitness exceeds fatigue with high readiness. Attempt a top single or 3RM on a primary lift.",
      splitSuggestion: "Upper / Lower with one heavy primary at RPE 9.",
    };
  }
  if (readiness >= 60) {
    return {
      action: "PUSH",
      title: "Push Volume",
      detail: "System is recovered enough to add stimulus. Add 1–2 sets to lagging muscle groups this week.",
      splitSuggestion: "Push / Pull / Legs, RPE 7–8.",
    };
  }
  return {
    action: "MAINTAIN",
    title: "Hold the Line",
    detail: "Stable accumulation phase. Keep volume constant and let fitness catch fatigue.",
    splitSuggestion: "Current split, RPE 7.",
  };
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const round = (x: number, p = 0) => { const f = 10 ** p; return Math.round(x * f) / f; };
