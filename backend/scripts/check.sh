#!/bin/sh
set -eu

ruff format --check .
ruff check .
python manage.py makemigrations --check --dry-run
python manage.py check --fail-level WARNING
DJANGO_SECURE_SSL_REDIRECT=true python manage.py check --deploy --fail-level WARNING
python manage.py migrate --noinput
python manage.py migrate --check
python manage.py test --verbosity 2
pip-audit --local
