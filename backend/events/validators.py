import re
from pathlib import Path

from django.core.exceptions import ValidationError

HTML_TAG = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")
ALLOWED_POSTER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def validate_plain_text(value):
    if value and HTML_TAG.search(value):
        raise ValidationError("Use plain text only; HTML tags are not accepted.")


def validate_lineup(value):
    if not isinstance(value, list):
        raise ValidationError("Lineup must be an ordered list of names.")
    if len(value) > 50:
        raise ValidationError("Lineup cannot contain more than 50 names.")
    for name in value:
        if not isinstance(name, str) or not name.strip():
            raise ValidationError("Every lineup entry must be a non-empty name.")
        if len(name) > 120:
            raise ValidationError("Lineup names cannot exceed 120 characters.")
        validate_plain_text(name)


def validate_poster_extension(upload):
    suffix = Path(upload.name).suffix.lower()
    if suffix not in ALLOWED_POSTER_EXTENSIONS:
        raise ValidationError("Upload a JPEG, PNG, or WebP raster poster.")

    from .images import inspect_poster

    inspect_poster(upload)
