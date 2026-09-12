import tempfile

from axes.models import AccessAttempt
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice

from events.models import Event
from events.services import save_event_from_request

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

    def event_manager_client(self):
        manager = get_user_model().objects.create_user(
            username="event-manager",
            password="Correct-horse-battery-783",
            is_staff=True,
        )
        manager.groups.add(Group.objects.get(name="Event managers"))
        device = TOTPDevice.objects.create(
            user=manager,
            name="Manager authenticator",
            confirmed=True,
            key="3132333435363738393031323334353637383930",
        )
        return self.verified_client(user=manager, device=device), manager

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
        self.assertTrue(self.user.has_perm("events.view_event"))
        self.assertTrue(self.user.has_perm("events.add_event"))
        self.assertTrue(self.user.has_perm("events.change_event"))
        self.assertFalse(self.user.has_perm("events.delete_event"))
        self.assertFalse(self.user.has_perm("events.publish_event"))

    def test_event_editor_can_save_drafts_but_cannot_publish_or_edit_public_events(self):
        draft = Event(slug="editor-draft")
        save_event_from_request(draft, self.user)
        self.assertEqual(draft.publication_status, Event.PublicationStatus.DRAFT)

        draft.publication_status = Event.PublicationStatus.PUBLISHED
        with self.assertRaises(PermissionDenied):
            save_event_from_request(draft, self.user)

        published = Event(
            **event_fields(
                slug="manager-published",
                publication_status=Event.PublicationStatus.PUBLISHED,
            )
        )
        published.save()
        published_page = self.verified_client().get(
            reverse("frekuence_staff:events_event_change", args=(published.pk,)),
            secure=True,
        )
        self.assertEqual(published_page.status_code, 200)
        self.assertNotContains(published_page, 'name="_save"')

    def test_role_specific_event_admin_controls_are_simple_and_enforced(self):
        editor_page = self.verified_client().get(
            reverse("frekuence_staff:events_event_add"), secure=True
        )
        self.assertEqual(editor_page.status_code, 200)
        self.assertNotContains(editor_page, 'name="publication_status"')
        self.assertNotContains(editor_page, 'name="is_featured"')

        manager_client, manager = self.event_manager_client()
        manager_page = manager_client.get(reverse("frekuence_staff:events_event_add"), secure=True)
        self.assertEqual(manager_page.status_code, 200)
        self.assertContains(manager_page, 'name="publication_status"')
        self.assertContains(manager_page, 'name="is_featured"')
        self.assertTrue(manager.has_perm("events.publish_event"))
        self.assertTrue(manager.has_perm("events.delete_event"))

    def test_password_login_requires_a_separate_valid_totp_step(self):
        login_url = reverse("frekuence_staff:login")
        response = self.client.post(
            login_url,
            {"username": self.user.username, "password": "Correct-horse-battery-783"},
            secure=True,
            REMOTE_ADDR="192.0.2.10",
        )
        self.assertRedirects(
            response,
            reverse("frekuence_staff:login_verify"),
            fetch_redirect_response=False,
        )
        self.assertNotIn("_auth_user_id", self.client.session)

        token = totp(
            self.device.bin_key,
            step=self.device.step,
            t0=self.device.t0,
            digits=self.device.digits,
            drift=self.device.drift,
        )
        response = self.client.post(
            reverse("frekuence_staff:login_verify"),
            {"otp_token": str(token).zfill(self.device.digits)},
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

    @override_settings(AXES_FAILURE_LIMIT=2)
    def test_forwarded_clients_have_independent_lockout_and_audit_keys(self):
        login_url = reverse("frekuence_staff:login")
        first_client = Client()
        second_client = Client()

        for _ in range(2):
            first_response = first_client.post(
                login_url,
                {"username": self.user.username, "password": "wrong-password"},
                secure=True,
                REMOTE_ADDR="172.20.0.4",
                HTTP_X_FORWARDED_FOR="198.51.100.24",
            )
        second_response = second_client.post(
            login_url,
            {"username": self.user.username, "password": "wrong-password"},
            secure=True,
            REMOTE_ADDR="172.20.0.4",
            HTTP_X_FORWARDED_FOR="203.0.113.9",
        )

        self.assertEqual(first_response.status_code, 429)
        self.assertEqual(second_response.status_code, 200)
        attempts = {
            attempt.ip_address: attempt.failures_since_start
            for attempt in AccessAttempt.objects.filter(username=self.user.username)
        }
        self.assertEqual(
            attempts,
            {"198.51.100.24": 2, "203.0.113.9": 1},
        )

    def test_admin_state_changes_enforce_csrf(self):
        client = self.verified_client(enforce_csrf_checks=True)
        response = client.post(
            reverse("frekuence_staff:events_event_add"),
            self.draft_admin_payload(),
            secure=True,
        )
        self.assertEqual(response.status_code, 403)

    def test_split_schedule_inputs_have_accessible_names(self):
        response = self.verified_client().get(
            reverse("frekuence_staff:events_event_add"),
            secure=True,
        )

        self.assertContains(response, 'aria-label="Start date"')
        self.assertContains(response, 'aria-label="Start time"')
        self.assertContains(response, 'aria-label="End date"')
        self.assertContains(response, 'aria-label="End time"')
        self.assertContains(response, 'aria-label="Doors date"')
        self.assertContains(response, 'aria-label="Doors time"')

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
        client, _manager = self.event_manager_client()
        response = client.post(
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
        client, manager = self.event_manager_client()
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
        self.assertEqual(event.updated_by, manager)

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
        client, manager = self.event_manager_client()
        response = client.post(
            reverse("frekuence_staff:events_event_change", args=(second.pk,)),
            payload,
            secure=True,
        )

        self.assertEqual(response.status_code, 302)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_featured)
        self.assertTrue(second.is_featured)
        self.assertEqual(second.updated_by, manager)

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

    @override_settings(
        ALLOWED_HOSTS=["frekuence.club"],
        CSRF_COOKIE_SECURE=True,
        SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https"),
        SECURE_SSL_REDIRECT=True,
        SESSION_COOKIE_SECURE=True,
    )
    def test_internal_health_probe_works_with_production_security_settings(self):
        response = self.client.get(
            "/healthz/",
            HTTP_HOST="frekuence.club",
            HTTP_X_FORWARDED_PROTO="https",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

        public_http_response = self.client.get(
            "/healthz/",
            HTTP_HOST="frekuence.club",
        )
        self.assertEqual(public_http_response.status_code, 301)
        self.assertEqual(
            public_http_response.headers["Location"],
            "https://frekuence.club/healthz/",
        )


class StaffRoleMigrationTests(TestCase):
    def test_staff_roles_map_to_the_expected_bounded_permissions(self):
        expected = {
            "Event viewers": {"view_event"},
            "Event editors": {"add_event", "change_event", "view_event"},
            "Event managers": {
                "add_event",
                "change_event",
                "delete_event",
                "publish_event",
                "view_event",
            },
            "Staff managers": {
                "add_event",
                "change_event",
                "delete_event",
                "manage_staff_accounts",
                "publish_event",
                "view_event",
            },
        }
        for group_name, expected_permissions in expected.items():
            actual = set(
                Group.objects.get(name=group_name).permissions.values_list("codename", flat=True)
            )
            self.assertEqual(actual, expected_permissions)

    def test_expected_event_permissions_exist(self):
        self.assertEqual(
            Permission.objects.filter(
                content_type__app_label="events", content_type__model="event"
            ).count(),
            5,
        )
