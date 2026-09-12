import io
import warnings
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from PIL import Image, ImageOps, UnidentifiedImageError

FORMAT_RULES = {
    "JPEG": {"extensions": {".jpg", ".jpeg"}, "mime_types": {"image/jpeg"}, "suffix": ".jpg"},
    "PNG": {"extensions": {".png"}, "mime_types": {"image/png"}, "suffix": ".png"},
    "WEBP": {"extensions": {".webp"}, "mime_types": {"image/webp"}, "suffix": ".webp"},
}
DERIVATIVE_WIDTHS = {
    "poster_480": 480,
    "poster_960": 960,
    "poster_1440": 1440,
    "poster_social": 1200,
}
POSTER_ASPECT_WIDTH = 4
POSTER_ASPECT_HEIGHT = 5
POSTER_ASPECT_TOLERANCE = 0.01


@dataclass(frozen=True)
class InspectedPoster:
    data: bytes
    format: str
    suffix: str
    width: int
    height: int


@dataclass(frozen=True)
class PosterDerivative:
    data: bytes
    width: int
    height: int


@dataclass(frozen=True)
class ProcessedPoster:
    original: InspectedPoster
    derivatives: dict[str, PosterDerivative]


def _read_upload(upload):
    try:
        upload.seek(0)
        data = upload.read(settings.EVENT_POSTER_MAX_BYTES + 1)
    finally:
        try:
            upload.seek(0)
        except (AttributeError, OSError):
            pass
    if not data:
        raise ValidationError("The poster file is empty.")
    if len(data) > settings.EVENT_POSTER_MAX_BYTES:
        raise ValidationError("The poster exceeds the 25 MiB upload limit.")
    return data


def inspect_poster(upload):
    data = _read_upload(upload)
    suffix = Path(upload.name).suffix.lower()
    declared_mime = getattr(upload, "content_type", None)

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as probe:
                detected_format = probe.format
                encoded_width, encoded_height = probe.size
                probe.verify()
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as error:
        raise ValidationError("The poster is malformed or cannot be safely decoded.") from error

    rule = FORMAT_RULES.get(detected_format)
    if rule is None:
        raise ValidationError("Upload a JPEG, PNG, or WebP raster poster.")
    if suffix not in rule["extensions"]:
        raise ValidationError("The poster extension does not match its decoded image format.")
    if declared_mime and declared_mime not in rule["mime_types"]:
        raise ValidationError("The poster content type does not match its decoded image format.")
    if encoded_width <= 0 or encoded_height <= 0:
        raise ValidationError("The poster must have non-zero dimensions.")
    if encoded_width * encoded_height > settings.EVENT_POSTER_MAX_PIXELS:
        raise ValidationError("The poster exceeds the 40 megapixel decoded-image limit.")

    try:
        with Image.open(io.BytesIO(data)) as decoded:
            decoded.load()
            normalized = ImageOps.exif_transpose(decoded)
            try:
                width, height = normalized.size
            finally:
                if normalized is not decoded:
                    normalized.close()
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise ValidationError("The poster is malformed or cannot be safely decoded.") from error

    expected = width * POSTER_ASPECT_HEIGHT
    actual = height * POSTER_ASPECT_WIDTH
    tolerance = max(expected, actual) * POSTER_ASPECT_TOLERANCE
    if abs(expected - actual) > tolerance:
        raise ValidationError("Upload a 4:5 portrait poster, ideally 1600 x 2000 pixels.")

    return InspectedPoster(data, detected_format, rule["suffix"], width, height)


def process_poster(upload):
    inspected = inspect_poster(upload)
    try:
        with Image.open(io.BytesIO(inspected.data)) as source:
            source.load()
            normalized = ImageOps.exif_transpose(source)
            if normalized.mode not in {"RGB", "RGBA"}:
                normalized = normalized.convert(
                    "RGBA" if "transparency" in normalized.info else "RGB"
                )
            else:
                normalized = normalized.copy()
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise ValidationError("The poster could not be normalized.") from error

    original_output = io.BytesIO()
    original_for_encoding = normalized
    if inspected.format == "JPEG" and normalized.mode != "RGB":
        original_for_encoding = normalized.convert("RGB")
    original_for_encoding.save(original_output, format=inspected.format, exif=b"")
    if original_for_encoding is not normalized:
        original_for_encoding.close()
    sanitized_original = InspectedPoster(
        original_output.getvalue(),
        inspected.format,
        inspected.suffix,
        normalized.width,
        normalized.height,
    )

    derivatives = {}
    for field_name, target_width in DERIVATIVE_WIDTHS.items():
        derivative = normalized.copy()
        derivative.thumbnail((target_width, target_width * 4), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        derivative.save(output, format="WEBP", quality=82, method=6, exif=b"")
        derivatives[field_name] = PosterDerivative(
            data=output.getvalue(), width=derivative.width, height=derivative.height
        )
        derivative.close()
    normalized.close()
    return ProcessedPoster(sanitized_original, derivatives)
