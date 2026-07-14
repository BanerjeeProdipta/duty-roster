FROM python:3.12-slim

WORKDIR /app

COPY services/solver_service/requirements.txt services/solver_service/requirements.txt
RUN pip install --no-cache-dir -r services/solver_service/requirements.txt

COPY packages/api/src/roster/solver.py packages/api/src/roster/solver.py
COPY services/solver_service/app.py services/solver_service/app.py

WORKDIR /app/services/solver_service

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
