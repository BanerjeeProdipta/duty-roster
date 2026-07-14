# solver_service

Standalone HTTP wrapper around `packages/api/src/roster/solver.py`'s `fallback_solve()`,
deployed separately from the Cloudflare Worker (`apps/server`) because Workers cannot
spawn Python subprocesses. See `packages/api/src/roster/utils.ts`'s `runSolver()` for
the caller — it POSTs to `SOLVER_URL/solve` when `SOLVER_URL` is set (production), and
falls back to a local `python3` subprocess otherwise (local dev, CI).

## Local run

```sh
cd services/solver_service
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Test:

```sh
curl -X POST localhost:8000/solve \
  -H "Content-Type: application/json" \
  -H "X-Solver-Token: test" \
  -d @sample_payload.json
```

(`sample_payload.json` — capture a real `solverPayload` from a local `generateRoster()`
console log, or build one matching the shape built in `service.ts`'s
`generateRoster()` around line 836.)

If `SOLVER_TOKEN` is unset in the environment, the `/solve` endpoint skips auth
(useful for local testing without setting a token).

## Deploying to Back4app Containers (free tier)

A `Dockerfile` is provided at the **repo root** (Back4app's simple deploy flow requires
it there, no path override available). It builds with the repo root as context so it
can `COPY` both `services/solver_service/` and `packages/api/src/roster/solver.py`
into the image — this preserves the same relative layout `app.py`'s `sys.path` import
expects, so no code changes are needed for containerized deploys.

1. New app on Back4app → Containers as a Service → connect this GitHub repo.
2. Add environment variable `SOLVER_TOKEN` (any random secret string) — the container
   also honors a platform-injected `PORT` (the `Dockerfile`'s `CMD` falls back to
   `8000` if `PORT` isn't set).
3. Deploy. Back4app gives you a public HTTPS URL for the container — that's your
   `SOLVER_URL`.
4. Set `SOLVER_URL` (the Back4app URL) and `SOLVER_TOKEN` (same value) as Worker
   secrets — see `.github/workflows/deploy.yml` and `apps/server/wrangler.toml`.

Test the built image locally first if you have Docker:

```sh
docker build -t solver-service -f Dockerfile .
docker run -p 8000:8000 -e SOLVER_TOKEN=test solver-service
curl -X POST localhost:8000/solve -H "X-Solver-Token: test" -d @sample_payload.json
```

`runSolver()`'s fetch timeout is sized generously to cover cold starts plus
worst-case CP-SAT solve time regardless of host.
