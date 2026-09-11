import io
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from events.models import Event


def image_upload(
    *, name="poster.png", image_format="PNG", content_type="image/png", size=(120, 180), exif=None
):
    output = io.BytesIO()
    image = Image.new("RGB", size, "#ff3737")
    image.save(output, format=image_format, exif=exif or b"")
    image.close()
    return SimpleUploadedFile(name, output.getvalue(), content_type=content_type)


def event_fields(**overrides):
    start = timezone.now() + timedelta(days=7)
    fields = {
        "slug": "development-test-event",
        "title_sq": "Titull prove",
        "title_en": "Test title",
        "summary_sq": "Përmbledhje prove.",
        "summary_en": "Test summary.",
        "description_sq": "Përshkrim prove.",
        "description_en": "Test description.",
        "starts_at": start,
        "ends_at": start + timedelta(hours=6),
        "doors_at": start - timedelta(hours=1),
        "lineup": ["TEST ACT ONE", "TEST ACT TWO"],
        "poster": image_upload(),
        "publication_status": Event.PublicationStatus.DRAFT,
    }
    fields.update(overrides)
    return fields
