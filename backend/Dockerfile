FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

COPY pyproject.toml ./
COPY app ./app
RUN pip install .

# Run as an ordinary user. The SQLite file lives in /data, which is a volume.
RUN useradd --create-home --uid 1000 rerun \
    && mkdir /data \
    && chown rerun /data
USER rerun

ENV RERUN_DATABASE_URL=sqlite:////data/rerun.db
VOLUME /data
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
