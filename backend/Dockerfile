FROM python:3.13.14-slim-bookworm@sha256:67a1e1f215ccda113cfc024e8639049257e88f273898f595b61476d128d387e8 AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH=/venv/bin:$PATH

RUN groupadd --gid 10001 frekuence \
    && useradd --uid 10001 --gid frekuence --create-home --home-dir /home/frekuence frekuence \
    && mkdir -p /app /vol/media /vol/static \
    && chown -R frekuence:frekuence /app /vol/media /vol/static

WORKDIR /app

FROM base AS production-dependencies
COPY requirements.lock /tmp/requirements.lock
RUN python -m venv /venv \
    && pip install --require-hashes --requirement /tmp/requirements.lock

FROM base AS development-dependencies
COPY requirements-dev.lock /tmp/requirements-dev.lock
RUN python -m venv /venv \
    && pip install --require-hashes --requirement /tmp/requirements-dev.lock

FROM base AS runtime
COPY --from=production-dependencies /venv /venv
COPY --chown=frekuence:frekuence . /app
RUN rm -rf /app/tests /app/events/management/commands/seed_dev_data.py
USER 10001:10001
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind=0.0.0.0:8000", "--workers=2", "--threads=2", "--timeout=30", "--no-control-socket", "--access-logfile=-", "--error-logfile=-"]

FROM base AS test
COPY --from=development-dependencies /venv /venv
COPY --chown=frekuence:frekuence . /app
USER 10001:10001
CMD ["/app/scripts/check.sh"]
