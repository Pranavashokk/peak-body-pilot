
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  baseline_weight_kg NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Daily metrics: bodyweight, sleep hours, subjective readiness
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bodyweight_kg NUMERIC,
  sleep_hours NUMERIC,
  subjective_readiness INT, -- 1..10
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_metrics TO authenticated;
GRANT ALL ON public.daily_metrics TO service_role;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_metrics" ON public.daily_metrics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workout sessions
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  split TEXT, -- e.g. Push/Pull/Legs/Upper/Lower/Full
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sets within a session
CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  muscle_group TEXT NOT NULL, -- chest, back, legs, shoulders, arms, core
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  rpe NUMERIC, -- 1..10
  set_index INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sets" ON public.workout_sets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sets_user_date ON public.workout_sets(user_id, created_at DESC);
CREATE INDEX idx_metrics_user_date ON public.daily_metrics(user_id, metric_date DESC);
CREATE INDEX idx_sessions_user_date ON public.workout_sessions(user_id, session_date DESC);
