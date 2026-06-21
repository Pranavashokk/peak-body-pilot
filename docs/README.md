# Mesocycle — Static Demo

Standalone single-file HTML build of Mesocycle. Deployable on **GitHub Pages**.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages**.
3. Source: **Deploy from a branch** → Branch: `main` → Folder: `/docs`.
4. Save. Site goes live at `https://<user>.github.io/<repo>/`.

## What's included

- Demo email/password auth (localStorage)
- Daily metrics log (bodyweight, sleep, subjective readiness)
- Training set log (muscle, exercise, weight, reps, RPE)
- EWMA fitness (τ=28d) / fatigue (τ=4d) / readiness model
- Bodyweight 7-day regression trend
- Adaptive planner per muscle group
- System directive (PR_ATTEMPT / PUSH / MAINTAIN / DELOAD / MACRO_ADJUST)
- JSON + CSV export
- Demo data seeder

All data stays in the browser (`localStorage`). No backend.
