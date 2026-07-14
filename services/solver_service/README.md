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

## Running as the production solver (this machine + Cloudflare Tunnel)

Currently in use: `run-local.sh` runs this service on whichever machine starts it,
exposes it via a Cloudflare quick tunnel, and points the deployed Worker's
`SOLVER_URL` at the resulting URL by editing `apps/server/wrangler.toml` and running
`wrangler deploy`. There's no free cloud host in the mix — trade-off is that the
solver is only reachable while someone has this running.

One-time setup:

```sh
brew install cloudflared
cd apps/server && bunx wrangler login   # opens a browser for Cloudflare OAuth
```

Create `services/solver_service/.env.local` (gitignored) with:

```
SOLVER_TOKEN=<same value as the SOLVER_TOKEN GitHub secret>
```

Then, whenever you need to generate a roster from the deployed web app:

```sh
services/solver_service/run-local.sh
```

This starts the local solver, opens the tunnel, rewrites `SOLVER_URL` in
`apps/server/wrangler.toml`, and redeploys the Worker — leave it running, then
click **Generate Roster** in the web app. Press Ctrl+C to stop; the Worker will
keep pointing at the now-dead tunnel URL until you run the script again. The
tunnel URL is random per run, so `wrangler.toml`'s `SOLVER_URL` is expected to
show as locally modified after each run — that's normal, not a bug.

## Alternative: containerized deploy (Dockerfile provided, untested against a
## permanent free host)

A `Dockerfile` is provided at the **repo root** for platforms that deploy from a
Dockerfile (e.g. Back4app Containers). It builds with the repo root as context so
it can `COPY` both `services/solver_service/` and `packages/api/src/roster/solver.py`
into the image, preserving the relative layout `app.py`'s `sys.path` import expects.

Note: Back4app's free container tier was tried and works functionally, but only
issues a **temporary URL that expires after 60 minutes** unless you upgrade to a
paid plan — not practical for this project's needs, hence the local-machine
approach above instead. Kept here in case a genuinely free, permanent-URL
container host is found later.

```sh
docker build -t solver-service -f Dockerfile .
docker run -p 8000:8000 -e SOLVER_TOKEN=test solver-service
curl -X POST localhost:8000/solve -H "X-Solver-Token: test" -d @sample_payload.json
```

`runSolver()`'s fetch timeout is sized generously to cover cold starts plus
worst-case CP-SAT solve time regardless of host.
