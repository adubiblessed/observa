"""Gunicorn config for prod.

`workers = 2 * CPU + 1` (well-known Web rule of thumb for IO-bound).
`preload_app` flip is the only knob that's runtime-sensitive — keep OFF
with sqlalchemy async pools to avoid forked-shared pool refs.

Override anything via env or `gunicorn -c gunicorn_conf.py -w N`.
"""

from __future__ import annotations

import multiprocessing
import os


bind = os.getenv("GUNICORN_BIND", "0.0.0.0:8000")
workers = int(
    os.getenv("GUNICORN_WORKERS", os.getenv("WEB_CONCURRENCY", 2 * multiprocessing.cpu_count() + 1))
)
worker_class = "uvicorn.workers.UvicornWorker"
timeout = int(os.getenv("GUNICORN_TIMEOUT", "30"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "1000"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "100"))

accesslog = os.getenv("GUNICORN_ACCESS_LOG", "-")
errorlog = os.getenv("GUNICORN_ERROR_LOG", "-")
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
access_log_format = (
    '%(h)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(L)s'
)

# Avoid sharing async pool/redis handles across forks — uvicorn workers
# re-create their own on first request. Do NOT set preload_app=True here.
preload_app = False


def on_starting(server) -> None:
    server.log.info("gunicorn.start bind=%s workers=%d", bind, workers)


def post_fork(server, worker) -> None:
    server.log.info("gunicorn.fork worker=%d pid=%d", worker.nr, worker.pid)


def worker_int(worker) -> None:
    worker.log.info("gunicorn.worker_interrupt pid=%d", worker.pid)
