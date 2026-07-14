import os
import secrets
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse

sys.path.insert(
    0, str(Path(__file__).resolve().parents[2] / "packages/api/src/roster")
)
from solver import fallback_solve  # noqa: E402

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/solve")
def solve(data: dict, x_solver_token: Optional[str] = Header(default=None)):
    expected_token = os.environ.get("SOLVER_TOKEN")
    if expected_token and (
        not x_solver_token or not secrets.compare_digest(x_solver_token, expected_token)
    ):
        raise HTTPException(status_code=401, detail="Invalid or missing solver token")

    result = fallback_solve(data)
    return JSONResponse(content=result)
