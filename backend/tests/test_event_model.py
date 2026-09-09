import tempfile
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone

from events.forms import EventAdminForm
from events.models import Event
from events.services import save_event_from_request, select_homepage_primary

from .helpers import event_fields


class EventModelTests(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()

    def tearDown(self):
        self.settings_override.disable()
        self.media.cleanup()

    def test_incomplete_draft_is_valid(self):
        event = Event(slug="incomplete-draft")
        event.full_clean()

    def test_end_must_follow_start(self):
        start = timezone.now()
        event = Event(slug="invalid-timing", starts_at=start, ends_at=start)
        with self.assertRaisesMessage(ValidationError, "later than start"):
            event.full_clean()

    def test_doors_cannot_follow_start(self):
        start = timezone.now()
        event = Event(
            slug="invalid-doors",
            starts_at=start,
            ends_at=start + timedelta(hours=4),
            doors_at=start + timedelta(minutes=1),
        )
        with self.assertRaisesMessage(ValidationError, "cannot be later"):
            event.full_clean()

    def test_datetimes_must_be_timezone_aware(self):
        event = Event(
            slug="naive-time",
            starts_at=datetime(2030, 1, 1, 22),
            ends_at=datetime(2030, 1, 2, 4),
        )
        with self.assertRaisesMessage(ValidationError, "timezone information"):
            event.full_clean()

    def test_slug_is_lowercase_and_stable_format(self):
        event = Event(slug="Invalid_Slug")
        with self.assertRaises(ValidationError):
            event.full_clean()

    def test_lineup_is_an_ordered_bounded_list(self):
        event = Event(slug="invalid-lineup", lineup="not-a-list")
        with self.assertRaisesMessage(ValidationError, "ordered list"):
            event.full_clean()
        event.lineup = ["<script>alert(1)</script>"]
        with self.assertRaisesMessage(ValidationError, "plain text"):
            event.full_clean()

    def test_raw_html_is_rejected_from_localized_content(self):
        event = Event(slug="stored-xss", description_en="<script>alert(1)</script>")
        with self.assertRaisesMessage(ValidationError, "plain text"):
            event.full_clean()

    def test_publication_requires_bilingual_content_schedule_and_processed_poster(self):
        event = Event(
            slug="invalid-publication", publication_status=Event.PublicationStatus.PUBLISHED
        )
        with self.assertRaises(ValidationError) as caught:
            event.full_clean()
        for field in (
            "title_sq",
            "title_en",
            "summary_sq",
            "summary_en",
            "description_sq",
            "description_en",
            "starts_at",
            "ends_at",
            "poster",
        ):
            self.assertIn(field, caught.exception.message_dict)

    def test_published_event_processes_poster_and_sets_first_publication_time(self):
        event = Event(**event_fields(publication_status=Event.PublicationStatus.PUBLISHED))
        event.save()
        first_published_at = event.published_at

        self.assertIsNotNone(first_published_at)
        self.assertEqual(event.poster_metadata["version"], 1)
        self.assertTrue(event.poster_480.name.endswith(".webp"))
        self.assertTrue(event.poster_960.name.endswith(".webp"))
        self.assertTrue(event.poster_1440.name.endswith(".webp"))
        self.assertTrue(event.poster_social.name.endswith(".webp"))

        event.publication_status = Event.PublicationStatus.DRAFT
        event.save()
        event.publication_status = Event.PublicationStatus.PUBLISHED
        event.save()
        self.assertEqual(event.published_at, first_published_at)

    def test_cancelled_draft_and_past_events_cannot_be_featured(self):
        draft = Event(slug="featured-draft", is_featured=True)
        with self.assertRaisesMessage(ValidationError, "published"):
            draft.full_clean()

        cancelled = Event(
            **event_fields(
                slug="featured-cancelled",
                publication_status=Event.PublicationStatus.PUBLISHED,
                event_status=Event.EventStatus.CANCELLED,
                is_featured=True,
            )
        )
        with self.assertRaisesMessage(ValidationError, "Cancelled"):
            cancelled.full_clean()

        start = timezone.now() - timedelta(days=2)
        past = Event(
            **event_fields(
                slug="featured-past",
                starts_at=start,
                ends_at=start + timedelta(hours=4),
                publication_status=Event.PublicationStatus.PUBLISHED,
                is_featured=True,
            )
        )
        with self.assertRaisesMessage(ValidationError, "current or upcoming"):
            past.full_clean()

    def test_database_rejects_invalid_timing_when_validation_is_bypassed(self):
        start = timezone.now()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Event.objects.bulk_create(
                [Event(slug="database-timing", starts_at=start, ends_at=start)]
            )

    def test_database_rejects_incomplete_published_rows_when_validation_is_bypassed(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Event.objects.bulk_create(
                [
                    Event(
                        slug="database-incomplete-publication",
                        publication_status=Event.PublicationStatus.PUBLISHED,
                    )
                ]
            )

    def test_homepage_selection_prefers_feature_then_earliest_active_event(self):
        now = timezone.now()
        active = Event(
            **event_fields(
                slug="active-event",
                starts_at=now - timedelta(hours=2),
                ends_at=now + timedelta(hours=2),
                doors_at=now - timedelta(hours=3),
                publication_status=Event.PublicationStatus.PUBLISHED,
            )
        )
        active.save()
        featured = Event(
            **event_fields(
                slug="featured-future-event",
                starts_at=now + timedelta(days=2),
                ends_at=now + timedelta(days=2, hours=4),
                doors_at=now + timedelta(days=2) - timedelta(hours=1),
                publication_status=Event.PublicationStatus.PUBLISHED,
                is_featured=True,
            )
        )
        featured.save()

        self.assertEqual(select_homepage_primary(now), featured)
        Event.objects.filter(pk=featured.pk).update(is_featured=False)
        self.assertEqual(select_homepage_primary(now), active)

    def test_request_service_sets_actors_and_replaces_the_featured_override(self):
        user = get_user_model().objects.create_superuser(
            username="event-admin", password="a-long-test-password"
        )
        first = Event(
            **event_fields(
                slug="first-featured",
                publication_status=Event.PublicationStatus.PUBLISHED,
                is_featured=True,
            )
        )
        save_event_from_request(first, user)
        second = Event(
            **event_fields(
                slug="second-featured",
                publication_status=Event.PublicationStatus.PUBLISHED,
                is_featured=True,
            )
        )
        save_event_from_request(second, user)
        first.refresh_from_db()
        second.refresh_from_db()

        self.assertFalse(first.is_featured)
        self.assertTrue(second.is_featured)
        self.assertEqual(second.created_by, user)
        self.assertEqual(second.updated_by, user)

    def test_non_staff_cannot_use_request_save_service(self):
        user = get_user_model().objects.create_user(
            username="not-staff", password="a-long-test-password"
        )
        with self.assertRaisesMessage(PermissionDenied, "staff access"):
            save_event_from_request(Event(slug="unauthorized-save"), user)

    def test_audit_fields_and_processed_metadata_are_not_form_fields(self):
        form_fields = EventAdminForm().fields
        for field in (
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "published_at",
            "poster_metadata",
            "poster_480",
        ):
            self.assertNotIn(field, form_fields)
