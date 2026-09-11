"""Create unmistakably synthetic records for the disposable checkpoint 8 smoke only."""

import copy
import io
import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from PIL import Image

from events.models import Event

TOTP_KEY = "3132333435363738393031323334353637383930"
STAFF_USERNAME = "checkpoint8-qa-editor"
STAFF_PASSWORD = "Checkpoint8-QA-editor-password-783"
NONSTAFF_USERNAME = "checkpoint8-qa-nonstaff"
NONSTAFF_PASSWORD = "Checkpoint8-QA-nonstaff-password-783"

User = get_user_model()
staff = User.objects.create_user(
    username=STAFF_USERNAME,
    password=STAFF_PASSWORD,
    is_staff=True,
)
staff.groups.add(Group.objects.get(name="Event editors"))
staff_device = TOTPDevice.objects.create(
    user=staff,
    name="Checkpoint 8 synthetic authenticator",
    confirmed=True,
    key=TOTP_KEY,
)

nonstaff = User.objects.create_user(
    username=NONSTAFF_USERNAME,
    password=NONSTAFF_PASSWORD,
)
nonstaff_device = TOTPDevice.objects.create(
    user=nonstaff,
    name="Checkpoint 8 non-staff authenticator",
    confirmed=True,
    key=TOTP_KEY,
)

now = timezone.now()
image_buffer = io.BytesIO()
image = Image.new("RGB", (240, 360), "#c81d52")
image.save(image_buffer, format="PNG")
image.close()


def event_values(slug, title, starts_at, ends_at, **overrides):
    values = {
        "slug": slug,
        "title_sq": f"{title} SQ",
        "title_en": title,
        "summary_sq": "Përmbajtje sintetike vetëm për kontrollin e integruar; jo event real.",
        "summary_en": "Synthetic content for integrated validation only; not a real event.",
        "description_sq": "Ky rekord sintetik ekziston vetëm në volume testimi të disponueshme.",
        "description_en": "This synthetic record exists only in disposable test volumes.",
        "starts_at": starts_at,
        "ends_at": ends_at,
        "doors_at": starts_at - timedelta(hours=1),
        "lineup": ["CHECKPOINT 8 SYNTHETIC ACT"],
        "poster_alt_sq": "Fushë posteri e kuqe sintetike.",
        "poster_alt_en": "Synthetic red poster field.",
        "entry_note_sq": "Vetëm kontroll sintetik.",
        "entry_note_en": "Synthetic validation only.",
        "publication_status": Event.PublicationStatus.PUBLISHED,
        "event_status": Event.EventStatus.SCHEDULED,
        "created_by": staff,
        "updated_by": staff,
    }
    values.update(overrides)
    return values


current = Event(
    **event_values(
        "checkpoint8-current-postponed",
        "CHECKPOINT 8 CURRENT POSTPONED SYNTHETIC",
        now - timedelta(hours=2),
        now + timedelta(hours=2),
        event_status=Event.EventStatus.POSTPONED,
        poster=SimpleUploadedFile(
            "checkpoint8-synthetic-poster.png",
            image_buffer.getvalue(),
            content_type="image/png",
        ),
    )
)
current.save()


def create_with_processed_poster(slug, title, starts_at, ends_at, **overrides):
    return Event.objects.create(
        **event_values(
            slug,
            title,
            starts_at,
            ends_at,
            poster=current.poster.name,
            poster_480=current.poster_480.name,
            poster_960=current.poster_960.name,
            poster_1440=current.poster_1440.name,
            poster_social=current.poster_social.name,
            poster_metadata=copy.deepcopy(current.poster_metadata),
            **overrides,
        )
    )


create_with_processed_poster(
    "checkpoint8-earliest-upcoming",
    "CHECKPOINT 8 EARLIEST SYNTHETIC EVENT",
    now + timedelta(days=2),
    now + timedelta(days=2, hours=6),
)
create_with_processed_poster(
    "checkpoint8-cancelled-notice",
    "CHECKPOINT 8 CANCELLED SYNTHETIC NOTICE",
    now + timedelta(days=4),
    now + timedelta(days=4, hours=6),
    event_status=Event.EventStatus.CANCELLED,
)
create_with_processed_poster(
    "checkpoint8-featured-upcoming",
    "CHECKPOINT 8 FEATURED SYNTHETIC EVENT",
    now + timedelta(days=7),
    now + timedelta(days=7, hours=6),
    is_featured=True,
)
create_with_processed_poster(
    "checkpoint8-later-upcoming",
    "CHECKPOINT 8 LATER SYNTHETIC EVENT",
    now + timedelta(days=9),
    now + timedelta(days=9, hours=6),
)
create_with_processed_poster(
    "checkpoint8-past-event",
    "CHECKPOINT 8 PAST SYNTHETIC EVENT",
    now - timedelta(days=3),
    now - timedelta(days=3) + timedelta(hours=6),
)
create_with_processed_poster(
    "checkpoint8-draft-private",
    "CHECKPOINT 8 PRIVATE DRAFT",
    now + timedelta(days=1),
    now + timedelta(days=1, hours=6),
    publication_status=Event.PublicationStatus.DRAFT,
)
create_with_processed_poster(
    "checkpoint8-intentionally-unpublished",
    "CHECKPOINT 8 INTENTIONALLY UNPUBLISHED",
    now + timedelta(days=3),
    now + timedelta(days=3, hours=6),
    publication_status=Event.PublicationStatus.DRAFT,
    published_at=now - timedelta(days=1),
)

print(
    json.dumps(
        {
            "original": current.poster.name,
            "staff_device": staff_device.persistent_id,
            "nonstaff_device": nonstaff_device.persistent_id,
        },
        sort_keys=True,
    )
)
