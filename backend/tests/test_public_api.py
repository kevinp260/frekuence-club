import json
import tempfile
from datetime import datetime, timedelta
from typing import ClassVar

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from events.models import Event

from .helpers import event_fields


class PublicEventAPITests(TestCase):
    list_fields: ClassVar[set[str]] = {
        "locale",
        "slug",
        "url",
        "alternateUrl",
        "title",
        "summary",
        "startsAt",
        "endsAt",
        "doorsAt",
        "timezone",
        "lineup",
        "status",
        "timing",
        "featured",
        "entryNote",
        "poster",
    }

    @classmethod
    def setUpClass(cls):
        cls.media = tempfile.TemporaryDirectory()
        cls.settings_override = override_settings(MEDIA_ROOT=cls.media.name)
        cls.settings_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        try:
            super().tearDownClass()
        finally:
            cls.settings_override.disable()
            cls.media.cleanup()

    @classmethod
    def create_event(
        cls,
        *,
        slug,
        starts_at,
        event_status="scheduled",
        featured=False,
        published=True,
    ):
        fields = event_fields(
            slug=slug,
            title_sq=f"SQ {slug}",
            title_en=f"EN {slug}",
            summary_sq=f"Përmbledhje SQ {slug}",
            summary_en=f"Summary EN {slug}",
            description_sq=f"Përshkrim SQ {slug}",
            description_en=f"Description EN {slug}",
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=4),
            doors_at=starts_at - timedelta(hours=1),
            poster_alt_sq=f"Alt SQ {slug}",
            poster_alt_en=f"Alt EN {slug}",
            entry_note_sq=f"Hyrja SQ {slug}",
            entry_note_en=f"Entry EN {slug}",
            event_status=event_status,
            is_featured=featured,
            publication_status=(
                Event.PublicationStatus.PUBLISHED if published else Event.PublicationStatus.DRAFT
            ),
        )
        return Event.objects.create(**fields)

    @classmethod
    def setUpTestData(cls):
        now = timezone.now()
        cls.current = cls.create_event(slug="current-signal", starts_at=now - timedelta(hours=1))
        cls.future = cls.create_event(
            slug="future-signal",
            starts_at=now + timedelta(days=1),
            featured=True,
        )
        cls.postponed = cls.create_event(
            slug="postponed-signal",
            starts_at=now + timedelta(days=2),
            event_status=Event.EventStatus.POSTPONED,
        )
        cls.cancelled = cls.create_event(
            slug="cancelled-signal",
            starts_at=now + timedelta(days=3),
            event_status=Event.EventStatus.CANCELLED,
        )
        cls.past = cls.create_event(slug="past-signal", starts_at=now - timedelta(days=3))
        cls.draft = cls.create_event(
            slug="complete-private-draft",
            starts_at=now + timedelta(days=4),
            published=False,
        )
        cls.intentionally_unpublished = Event.objects.create(slug="intentionally-unpublished")
        cls.staff = get_user_model().objects.create_user(
            username="private-api-auditor",
            password="Correct-horse-battery-783",
            is_staff=True,
        )
        Event.objects.filter(pk=cls.future.pk).update(
            created_by=cls.staff,
            updated_by=cls.staff,
        )
        cls.list_url = reverse("events-api-v1:event-list")

    def detail_url(self, event_or_slug):
        slug = event_or_slug.slug if isinstance(event_or_slug, Event) else event_or_slug
        return reverse("events-api-v1:event-detail", args=(slug,))

    def test_default_list_contains_only_published_events_in_albanian(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 4)
        self.assertEqual(
            [event["slug"] for event in payload["results"]],
            [
                "current-signal",
                "future-signal",
                "postponed-signal",
                "cancelled-signal",
            ],
        )
        self.assertTrue(all(event["locale"] == "sq" for event in payload["results"]))
        self.assertNotIn(self.draft.slug, json.dumps(payload))

    def test_list_and_detail_localize_only_the_requested_language(self):
        sq_list = self.client.get(self.list_url, {"locale": "sq"}).json()
        en_list = self.client.get(self.list_url, {"locale": "en"}).json()
        sq_future = next(item for item in sq_list["results"] if item["slug"] == self.future.slug)
        en_future = next(item for item in en_list["results"] if item["slug"] == self.future.slug)

        self.assertEqual(sq_future["title"], "SQ future-signal")
        self.assertEqual(en_future["title"], "EN future-signal")
        self.assertNotIn("EN future-signal", json.dumps(sq_future))
        self.assertNotIn("SQ future-signal", json.dumps(en_future))

        sq_detail = self.client.get(self.detail_url(self.future)).json()
        en_detail = self.client.get(
            self.detail_url(self.future),
            {"locale": "en"},
        ).json()
        self.assertEqual(sq_detail["description"], "Përshkrim SQ future-signal")
        self.assertEqual(en_detail["description"], "Description EN future-signal")
        self.assertEqual(sq_detail["url"], "/events/future-signal/")
        self.assertEqual(sq_detail["alternateUrl"], "/en/events/future-signal/")
        self.assertEqual(en_detail["url"], "/en/events/future-signal/")
        self.assertEqual(en_detail["alternateUrl"], "/events/future-signal/")

    def test_public_shapes_exclude_private_model_and_audit_fields(self):
        list_event = self.client.get(self.list_url).json()["results"][1]
        detail_event = self.client.get(self.detail_url(self.future)).json()

        self.assertEqual(set(list_event), self.list_fields)
        self.assertEqual(set(detail_event), self.list_fields | {"description"})
        serialized = json.dumps(detail_event)
        for private_value in (
            str(self.future.pk),
            self.staff.username,
            self.future.poster.url,
            "publicationStatus",
            "publishedAt",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "posterMetadata",
        ):
            self.assertNotIn(private_value, serialized)

    def test_unknown_and_unpublished_slugs_have_an_indistinguishable_404(self):
        responses = [
            self.client.get(self.detail_url("unknown-signal")),
            self.client.get(self.detail_url(self.draft)),
            self.client.get(self.detail_url(self.intentionally_unpublished)),
        ]

        self.assertTrue(all(response.status_code == 404 for response in responses))
        self.assertEqual({response.content for response in responses}, {responses[0].content})
        self.assertEqual(responses[0].json(), {"detail": "Event not found."})
        self.assertTrue(
            all(response.headers["Cache-Control"] == "no-store" for response in responses)
        )

    def test_cancelled_published_events_remain_visible_and_labelled(self):
        results = self.client.get(self.list_url).json()["results"]
        cancelled = next(item for item in results if item["slug"] == self.cancelled.slug)

        self.assertEqual(cancelled["status"], "cancelled")
        self.assertEqual(cancelled["timing"], "upcoming")
        self.assertFalse(cancelled["featured"])
        self.assertEqual(
            self.client.get(self.detail_url(self.cancelled)).json()["status"],
            "cancelled",
        )
        self.assertTrue(
            next(item for item in results if item["slug"] == self.future.slug)["featured"]
        )

    def test_current_future_and_past_filters_are_ordered_deterministically(self):
        upcoming = self.client.get(
            self.list_url,
            {"when": "upcoming", "limit": 20},
        ).json()["results"]
        recent = self.client.get(
            self.list_url,
            {"when": "recent", "limit": 20},
        ).json()["results"]

        self.assertEqual(
            [(event["slug"], event["timing"], event["status"]) for event in upcoming],
            [
                ("current-signal", "current", "scheduled"),
                ("future-signal", "upcoming", "scheduled"),
                ("postponed-signal", "upcoming", "postponed"),
                ("cancelled-signal", "upcoming", "cancelled"),
            ],
        )
        self.assertEqual(
            [(event["slug"], event["timing"]) for event in recent],
            [("past-signal", "past")],
        )

    def test_limit_offset_pagination_is_bounded_and_uses_relative_links(self):
        first_page = self.client.get(
            self.list_url,
            {"locale": "en", "when": "upcoming", "limit": 2},
        ).json()
        second_page = self.client.get(
            self.list_url,
            {"locale": "en", "when": "upcoming", "limit": 2, "offset": 2},
        ).json()

        self.assertEqual(first_page["count"], 4)
        self.assertIsNone(first_page["previous"])
        self.assertEqual(
            first_page["next"],
            "/api/v1/events/?locale=en&when=upcoming&limit=2&offset=2",
        )
        self.assertEqual(
            second_page["previous"],
            "/api/v1/events/?locale=en&when=upcoming&limit=2&offset=0",
        )
        self.assertIsNone(second_page["next"])
        self.assertEqual(len(first_page["results"]), 2)
        self.assertEqual(len(second_page["results"]), 2)

    def test_maximum_offset_is_accepted(self):
        response = self.client.get(self.list_url, {"offset": 10_000})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 4)
        self.assertEqual(response.json()["results"], [])

    def test_offset_above_the_practical_maximum_is_rejected_before_querying(self):
        with self.assertNumQueries(0):
            response = self.client.get(self.list_url, {"offset": 10_001})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_offset_above_postgresql_bigint_is_rejected_before_querying(self):
        with self.assertNumQueries(0):
            response = self.client.get(
                self.list_url,
                {"offset": 9_223_372_036_854_775_808},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_invalid_locales_filters_pagination_and_query_shapes_return_400(self):
        invalid_queries = (
            "?locale=fr",
            "?when=all",
            "?limit=0",
            "?limit=21",
            "?limit=many",
            "?offset=-1",
            "?offset=later",
            "?unexpected=true",
            "?locale=sq&locale=en",
        )

        for query in invalid_queries:
            with self.subTest(query=query):
                response = self.client.get(f"{self.list_url}{query}")
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.headers["Cache-Control"], "no-store")

        detail_response = self.client.get(self.detail_url(self.future), {"locale": "fr"})
        self.assertEqual(detail_response.status_code, 400)

    def test_unsafe_methods_are_rejected_and_safe_metadata_methods_remain_available(self):
        for url in (self.list_url, self.detail_url(self.future)):
            for method in ("post", "put", "patch", "delete"):
                with self.subTest(url=url, method=method):
                    response = getattr(self.client, method)(
                        url,
                        data={},
                        content_type="application/json",
                    )
                    self.assertEqual(response.status_code, 405)
                    self.assertEqual(response.headers["Cache-Control"], "no-store")

            head_response = self.client.head(url)
            self.assertEqual(head_response.status_code, 200)
            self.assertEqual(head_response.content, b"")
            self.assertEqual(self.client.options(url).status_code, 200)

    def test_list_etag_supports_conditional_requests_and_changes_with_output(self):
        response = self.client.get(self.list_url)
        etag = response.headers["ETag"]

        self.assertIn("public", response.headers["Cache-Control"])
        self.assertIn("max-age=60", response.headers["Cache-Control"])
        self.assertIn("stale-while-revalidate=300", response.headers["Cache-Control"])
        conditional = self.client.get(self.list_url, HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(conditional.status_code, 304)
        self.assertEqual(conditional.content, b"")
        self.assertEqual(conditional.headers["ETag"], etag)

        Event.objects.filter(pk=self.future.pk).update(summary_sq="Përmbledhje e ndryshuar")
        changed = self.client.get(self.list_url, HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(changed.status_code, 200)
        self.assertNotEqual(changed.headers["ETag"], etag)

    def test_detail_etag_supports_conditional_requests_and_unpublication(self):
        url = self.detail_url(self.future)
        response = self.client.get(url, {"locale": "en"})
        conditional = self.client.get(
            f"{url}?locale=en",
            HTTP_IF_NONE_MATCH=response.headers["ETag"],
        )
        self.assertEqual(conditional.status_code, 304)

        Event.objects.filter(pk=self.future.pk).update(
            publication_status=Event.PublicationStatus.DRAFT,
            is_featured=False,
        )
        unpublished = self.client.get(f"{url}?locale=en")
        self.assertEqual(unpublished.status_code, 404)
        self.assertEqual(unpublished.json(), {"detail": "Event not found."})

    def test_poster_serialization_exposes_only_managed_derivatives(self):
        poster = self.client.get(self.detail_url(self.future)).json()["poster"]

        self.assertEqual(poster["alt"], "Alt SQ future-signal")
        self.assertEqual(len(poster["sources"]), 3)
        for derivative in [*poster["sources"], poster["social"]]:
            self.assertEqual(set(derivative), {"url", "width", "height", "format"})
            self.assertTrue(derivative["url"].startswith("/media/events/derivatives/"))
            self.assertEqual(derivative["format"], "webp")
            self.assertGreater(derivative["width"], 0)
            self.assertGreater(derivative["height"], 0)
        self.assertNotIn("originals", json.dumps(poster))
        self.assertNotIn("path", json.dumps(poster))

    def test_response_datetimes_use_the_venue_timezone(self):
        event = self.client.get(self.detail_url(self.future)).json()

        self.assertEqual(event["timezone"], "Europe/Tirane")
        for field in ("startsAt", "endsAt", "doorsAt"):
            parsed = datetime.fromisoformat(event[field])
            self.assertIsNotNone(parsed.utcoffset())

    def test_list_and_detail_query_counts_do_not_grow_with_results(self):
        with self.assertNumQueries(2):
            response = self.client.get(self.list_url, {"limit": 20})
            self.assertEqual(response.status_code, 200)

        with self.assertNumQueries(1):
            response = self.client.get(self.detail_url(self.future))
            self.assertEqual(response.status_code, 200)
