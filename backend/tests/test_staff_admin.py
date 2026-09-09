import tempfile

from axes.models import AccessAttempt
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice

from events.models import Event

from .helpers import event_fields


class StaffAdminTests(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()
        AccessAttempt.objects.all().delete()
        self.user = get_user_model().objects.create_user(
            username="editor",
            password="Correct-horse-battery-783",
            is_staff=True,
        )
        self.group = Group.objects.get(name="Event editors")
        self.user.groups.add(self.group)
        self.device = TOTPDevice.objects.create(
            user=self.user,
            name="Test authenticator",
            confirmed=True,
            key="3132333435363738393031323334353637383930",
        )

    def tearDown(self):
        self.settings_override.disable()
        self.media.cleanup()

    def verified_client(self, *, enforce_csrf_checks=False, user=None, device=None):
        client = Client(enforce_csrf_checks=enforce_csrf_checks)
        client.force_login(user or self.user)
        session = client.session
        session[DEVICE_ID_SESSION_KEY] = (device or self.device).persistent_id
        session.save()
        return client

    def draft_admin_payload(self, **overrides):
        fields = event_fields(poster=None)
        start = fields["starts_at"].astimezone()
        end = fields["ends_at"].astimezone()
        doors = fields["doors_at"].astimezone()
        payload = {
            "slug": fields["slug"],
            "title_sq": fields["title_sq"],
            "title_en": fields["title_en"],
            "summary_sq": fields["summary_sq"],
            "summary_en": fields["summary_en"],
            "description_sq": fields["description_sq"],
            "description_en": fields["description_en"],
            "poster_alt_sq": "",
            "poster_alt_en": "",
            "entry_note_sq": "",
            "entry_note_en": "",
            "starts_at_0": start.strftime("%Y-%m-%d"),
            "starts_at_1": start.strftime("%H:%M:%S"),
            "ends_at_0": end.strftime("%Y-%m-%d"),
            "ends_at_1": end.strftime("%H:%M:%S"),
            "doors_at_0": doors.strftime("%Y-%m-%d"),
            "doors_at_1": doors.strftime("%H:%M:%S"),
            "lineup_text": "TEST ACT ONE\nTEST ACT TWO",
            "event_status": Event.EventStatus.SCHEDULED,
            "publication_status": Event.PublicationStatus.DRAFT,
            "is_featured": "",
            "_save": "Save",
        }
        payload.update(overrides)
        return payload

    def test_anonymous_non_staff_and_unverified_users_cannot_access_event_admin(self):
        changelist = reverse("frekuence_staff:events_event_changelist")
        self.assertEqual(Client().get(changelist, secure=True).status_code, 302)

        non_staff = get_user_model().objects.create_user(
            username="member", password="Correct-horse-battery-783"
        )
        client = Client()
        client.force_login(non_staff)
        self.assertEqual(client.get(changelist, secure=True).status_code, 302)

        unverified = Client()
        unverified.force_login(self.user)
        self.assertEqual(unverified.get(changelist, secure=True).status_code, 302)

    def test_verified_event_editor_has_only_event_model_permissions(self):
        response = self.verified_client().get(
            reverse("frekuence_staff:events_event_changelist"), secure=True
        )
        self.assertEqual(response.status_code, 200)
        permission_models = set(
            self.group.permissions.values_list("content_type__model", flat=True)
        )
        self.assertEqual(permission_models, {"event"})
        self.assertFalse(self.user.has_perm("auth.change_user"))

    def test_password_login_requires_a_valid_totp_token(self):
        login_url = reverse("frekuence_staff:login")
        response = self.client.post(
            login_url,
            {"username": self.user.username, "password": "Correct-horse-battery-783"},
            secure=True,
            REMOTE_ADDR="192.0.2.10",
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

        token = totp(
            self.device.bin_key,
            step=self.device.step,
            t0=self.device.t0,
            digits=self.device.digits,
            drift=self.device.drift,
        )
        response = self.client.post(
            login_url,
            {
                "username": self.user.username,
                "password": "Correct-horse-battery-783",
                "otp_device": self.device.persistent_id,
                "otp_token": str(token).zfill(self.device.digits),
                "next": reverse("frekuence_staff:index"),
            },
            secure=True,
            REMOTE_ADDR="192.0.2.10",
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    @override_settings(AXES_FAILURE_LIMIT=3)
    def test_repeated_failed_logins_are_rate_limited(self):
        login_url = reverse("frekuence_staff:login")
        for _ in range(3):
            response = self.client.post(
                login_url,
                {"username": self.user.username, "password": "wrong-password"},
                secure=True,
                REMOTE_ADDR="192.0.2.20",
            )
        self.assertEqual(response.status_code, 429)

    def test_admin_state_changes_enforce_csrf(self):
        client = self.verified_client(enforce_csrf_checks=True)
        response = client.post(
            reverse("frekuence_staff:events_event_add"),
            self.draft_admin_payload(),
            secure=True,
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_ignores_supplied_actor_ids_and_uses_request_user(self):
        attacker = get_user_model().objects.create_superuser(
            username="attacker", password="Correct-horse-battery-783"
        )
        payload = self.draft_admin_payload(
            created_by=str(attacker.pk),
            updated_by=str(attacker.pk),
        )
        response = self.verified_client().post(
            reverse("frekuence_staff:events_event_add"), payload, secure=True
        )
        self.assertEqual(response.status_code, 302)
        event = Event.objects.get(slug="development-test-event")
        self.assertEqual(event.created_by, self.user)
        self.assertEqual(event.updated_by, self.user)

    def test_safe_publish_action_rejects_incomplete_event(self):
        event = Event.objects.create(slug="incomplete-publish")
        response = self.verified_client().post(
            reverse("frekuence_staff:events_event_changelist"),
            {
                "action": "publish_selected",
                "_selected_action": [str(event.pk)],
                "index": "0",
            },
            secure=True,
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        event.refresh_from_db()
        self.assertEqual(event.publication_status, Event.PublicationStatus.DRAFT)
        self.assertContains(response, "required before publication")

    def test_safe_publish_and_unpublish_actions_attribute_request_user(self):
        event = Event(**event_fields(slug="action-publish"))
        event.save()
        client = self.verified_client()
        action_url = reverse("frekuence_staff:events_event_changelist")
        response = client.post(
            action_url,
            {
                "action": "publish_selected",
                "_selected_action": [str(event.pk)],
                "index": "0",
            },
            secure=True,
        )
        self.assertEqual(response.status_code, 302)
        event.refresh_from_db()
        self.assertEqual(event.publication_status, Event.PublicationStatus.PUBLISHED)
        self.assertEqual(event.updated_by, self.user)

        client.post(
            action_url,
            {
                "action": "unpublish_selected",
                "_selected_action": [str(event.pk)],
                "index": "0",
            },
            secure=True,
        )
        event.refresh_from_db()
        self.assertEqual(event.publication_status, Event.PublicationStatus.DRAFT)
        self.assertFalse(event.is_featured)

    def test_admin_can_atomically_replace_the_featured_event(self):
        first = Event(
            **event_fields(
                slug="first-admin-feature",
                publication_status=Event.PublicationStatus.PUBLISHED,
                is_featured=True,
            )
        )
        first.save()
        second = Event(
            **event_fields(
                slug="second-admin-feature",
                publication_status=Event.PublicationStatus.PUBLISHED,
            )
        )
        second.save()

        payload = self.draft_admin_payload(
            slug=second.slug,
            publication_status=Event.PublicationStatus.PUBLISHED,
            is_featured="on",
        )
        response = self.verified_client().post(
            reverse("frekuence_staff:events_event_change", args=(second.pk,)),
            payload,
            secure=True,
        )

        self.assertEqual(response.status_code, 302)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_featured)
        self.assertTrue(second.is_featured)
        self.assertEqual(second.updated_by, self.user)

    def test_strong_password_validation_and_secure_cookie_settings(self):
        with self.assertRaises(ValidationError):
            validate_password("password123")
        from django.conf import settings

        self.assertTrue(settings.SESSION_COOKIE_SECURE)
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertTrue(settings.CSRF_COOKIE_HTTPONLY)

    def test_no_public_signup_route_exists(self):
        self.assertEqual(self.client.get("/accounts/signup/", secure=True).status_code, 404)

    def test_health_check_uses_the_database(self):
        response = self.client.get("/healthz/", secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class EventEditorMigrationTests(TestCase):
    def test_event_editor_group_contains_exactly_event_crud_permissions(self):
        group = Group.objects.get(name="Event editors")
        actual = set(group.permissions.values_list("codename", flat=True))
        self.assertEqual(
            actual,
            {"add_event", "change_event", "delete_event", "view_event"},
        )

    def test_expected_event_permissions_exist(self):
        self.assertEqual(
            Permission.objects.filter(
                content_type__app_label="events", content_type__model="event"
            ).count(),
            4,
        )
