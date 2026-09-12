import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice

from staff_access.models import StaffSetupInvitation
from staff_access.roles import (
    EVENT_EDITOR,
    EVENT_MANAGER,
    EVENT_VIEWER,
    STAFF_MANAGER,
    SUPERUSER_ROLE,
    assign_staff_role,
)
from staff_access.services import claim_invitation, issue_invitation
from staff_access.site import OTP_MAX_ATTEMPTS, PARTIAL_AUTH_KEY

PASSWORD = "Correct-horse-battery-783"
NEW_PASSWORD = "New-correct-horse-battery-783"
TOTP_KEY = "3132333435363738393031323334353637383930"


def current_token(device):
    value = totp(
        device.bin_key,
        step=device.step,
        t0=device.t0,
        digits=device.digits,
        drift=device.drift,
    )
    return str(value).zfill(device.digits)


class StaffLoginFlowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="staff-login",
            password=PASSWORD,
            is_staff=True,
        )
        self.user.groups.add(Group.objects.get(name="Event editors"))

    def test_staff_without_authenticator_signs_in_with_password(self):
        response = self.client.post(
            reverse("frekuence_staff:login"),
            {"username": self.user.username, "password": PASSWORD},
            secure=True,
        )

        self.assertRedirects(
            response, reverse("frekuence_staff:index"), fetch_redirect_response=False
        )
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.user.pk)
        self.assertNotIn(DEVICE_ID_SESSION_KEY, self.client.session)
        self.assertEqual(
            self.client.get(
                reverse("frekuence_staff:events_event_changelist"),
                secure=True,
            ).status_code,
            200,
        )

    def test_staff_with_authenticator_uses_separate_verification_step(self):
        device = TOTPDevice.objects.create(
            user=self.user,
            name="Authenticator",
            confirmed=True,
            key=TOTP_KEY,
        )
        response = self.client.post(
            reverse("frekuence_staff:login"),
            {
                "username": self.user.username,
                "password": PASSWORD,
                "next": reverse("frekuence_staff:index"),
            },
            secure=True,
        )

        self.assertRedirects(
            response,
            reverse("frekuence_staff:login_verify"),
            fetch_redirect_response=False,
        )
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(
            self.client.session[PARTIAL_AUTH_KEY]["device_id"],
            device.persistent_id,
        )

        accepted = self.client.post(
            reverse("frekuence_staff:login_verify"),
            {"otp_token": current_token(device)},
            secure=True,
        )
        self.assertRedirects(
            accepted,
            reverse("frekuence_staff:index"),
            fetch_redirect_response=False,
        )
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.user.pk)
        self.assertEqual(self.client.session[DEVICE_ID_SESSION_KEY], device.persistent_id)

    def test_invalid_totp_does_not_create_an_authenticated_session(self):
        TOTPDevice.objects.create(
            user=self.user,
            name="Authenticator",
            confirmed=True,
            key=TOTP_KEY,
        )
        self.client.post(
            reverse("frekuence_staff:login"),
            {"username": self.user.username, "password": PASSWORD},
            secure=True,
        )

        response = self.client.post(
            reverse("frekuence_staff:login_verify"),
            {"otp_token": "000000"},
            secure=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "was not accepted")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_totp_attempt_limit_discards_partial_login(self):
        TOTPDevice.objects.create(
            user=self.user,
            name="Authenticator",
            confirmed=True,
            key=TOTP_KEY,
        )
        self.client.post(
            reverse("frekuence_staff:login"),
            {"username": self.user.username, "password": PASSWORD},
            secure=True,
        )

        for _ in range(OTP_MAX_ATTEMPTS - 1):
            response = self.client.post(
                reverse("frekuence_staff:login_verify"),
                {"otp_token": "99999999"},
                secure=True,
            )
            self.assertEqual(response.status_code, 200)

        response = self.client.post(
            reverse("frekuence_staff:login_verify"),
            {"otp_token": "99999999"},
            secure=True,
        )

        self.assertRedirects(
            response,
            reverse("frekuence_staff:login"),
            fetch_redirect_response=False,
        )
        self.assertNotIn(PARTIAL_AUTH_KEY, self.client.session)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_expired_partial_login_cannot_be_verified(self):
        TOTPDevice.objects.create(
            user=self.user,
            name="Authenticator",
            confirmed=True,
            key=TOTP_KEY,
        )
        self.client.post(
            reverse("frekuence_staff:login"),
            {"username": self.user.username, "password": PASSWORD},
            secure=True,
        )
        session = self.client.session
        session[PARTIAL_AUTH_KEY]["created_at"] = 0
        session.save()

        response = self.client.get(reverse("frekuence_staff:login_verify"), secure=True)

        self.assertRedirects(
            response,
            reverse("frekuence_staff:login"),
            fetch_redirect_response=False,
        )
        self.assertNotIn(PARTIAL_AUTH_KEY, self.client.session)

    def test_login_forms_do_not_combine_password_and_otp(self):
        password_page = self.client.get(reverse("frekuence_staff:login"), secure=True)
        self.assertContains(password_page, 'name="password"')
        self.assertNotContains(password_page, 'name="otp_token"')

        TOTPDevice.objects.create(user=self.user, name="Authenticator", confirmed=True)
        self.client.post(
            reverse("frekuence_staff:login"),
            {"username": self.user.username, "password": PASSWORD},
            secure=True,
        )
        otp_page = self.client.get(reverse("frekuence_staff:login_verify"), secure=True)
        self.assertContains(otp_page, 'name="otp_token"')
        self.assertNotContains(otp_page, 'name="password"')


class StaffInvitationTests(TestCase):
    def setUp(self):
        self.superuser = get_user_model().objects.create_superuser(
            username="staff-owner",
            password=PASSWORD,
        )
        self.staff = get_user_model().objects.create_user(
            username="new-editor",
            is_staff=True,
        )

    def test_invitation_is_hashed_expiring_and_single_use(self):
        issued = issue_invitation(user=self.staff, created_by=self.superuser)

        self.assertNotEqual(issued.invitation.token_digest, issued.token)
        self.assertNotIn(issued.token, issued.invitation.token_digest)
        self.assertAlmostEqual(
            issued.invitation.expires_at,
            timezone.now() + timedelta(hours=24),
            delta=timedelta(seconds=5),
        )
        self.assertEqual(claim_invitation(issued.fragment_value), issued.invitation)
        self.assertIsNone(claim_invitation(issued.fragment_value))

    def test_expired_or_malformed_invitation_is_rejected(self):
        issued = issue_invitation(user=self.staff, created_by=self.superuser)
        StaffSetupInvitation.objects.filter(pk=issued.invitation.pk).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )

        self.assertIsNone(claim_invitation(issued.fragment_value))
        self.assertIsNone(claim_invitation("not-a-valid-invitation"))

    def test_setup_link_token_uses_fragment_and_is_not_rendered_by_landing_page(self):
        issued = issue_invitation(user=self.staff, created_by=self.superuser)
        landing = self.client.get(reverse("frekuence_staff:staff_setup"), secure=True)

        self.assertEqual(landing.status_code, 200)
        self.assertNotContains(landing, issued.token)
        self.assertContains(landing, "setup-claim.js")

    def test_valid_invitation_can_set_password_and_explicitly_skip_totp(self):
        issued = issue_invitation(user=self.staff, created_by=self.superuser)
        claim = self.client.post(
            reverse("frekuence_staff:staff_setup_claim"),
            {"invitation": issued.fragment_value},
            secure=True,
        )
        self.assertRedirects(
            claim,
            reverse("frekuence_staff:staff_setup_account"),
            fetch_redirect_response=False,
        )

        completed = self.client.post(
            reverse("frekuence_staff:staff_setup_account"),
            {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD},
            secure=True,
        )

        self.assertRedirects(
            completed,
            reverse("frekuence_staff:index"),
            fetch_redirect_response=False,
        )
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password(NEW_PASSWORD))
        self.assertFalse(self.staff.totpdevice_set.exists())
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.staff.pk)

    def test_valid_invitation_can_confirm_authenticator_before_first_session(self):
        issued = issue_invitation(user=self.staff, created_by=self.superuser)
        self.client.post(
            reverse("frekuence_staff:staff_setup_claim"),
            {"invitation": issued.fragment_value},
            secure=True,
        )
        password_response = self.client.post(
            reverse("frekuence_staff:staff_setup_account"),
            {
                "new_password1": NEW_PASSWORD,
                "new_password2": NEW_PASSWORD,
                "enable_totp": "on",
            },
            secure=True,
        )
        self.assertRedirects(
            password_response,
            reverse("frekuence_staff:staff_setup_totp"),
            fetch_redirect_response=False,
        )
        device = self.staff.totpdevice_set.get(confirmed=False)

        confirmation = self.client.post(
            reverse("frekuence_staff:staff_setup_totp"),
            {"otp_token": current_token(device)},
            secure=True,
        )

        self.assertRedirects(
            confirmation,
            reverse("frekuence_staff:index"),
            fetch_redirect_response=False,
        )
        device.refresh_from_db()
        self.assertTrue(device.confirmed)
        self.assertEqual(self.client.session[DEVICE_ID_SESSION_KEY], device.persistent_id)

    def test_setup_claim_requires_csrf(self):
        issued = issue_invitation(user=self.staff, created_by=self.superuser)
        client = Client(enforce_csrf_checks=True)

        response = client.post(
            reverse("frekuence_staff:staff_setup_claim"),
            {"invitation": issued.fragment_value},
            secure=True,
        )

        self.assertEqual(response.status_code, 403)
        issued.invitation.refresh_from_db()
        self.assertIsNone(issued.invitation.claimed_at)


class StaffAccountSecurityTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="security-editor",
            password=PASSWORD,
            is_staff=True,
        )
        self.user.groups.add(Group.objects.get(name="Event editors"))

    def test_staff_can_enable_totp_from_account_security(self):
        self.client.force_login(self.user)
        page = self.client.get(reverse("frekuence_staff:staff_security_enable"), secure=True)
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, "Authenticator setup QR code")
        device = self.user.totpdevice_set.get(confirmed=False)

        response = self.client.post(
            reverse("frekuence_staff:staff_security_enable"),
            {"otp_token": current_token(device)},
            secure=True,
        )

        self.assertRedirects(
            response,
            reverse("frekuence_staff:staff_security"),
            fetch_redirect_response=False,
        )
        device.refresh_from_db()
        self.assertTrue(device.confirmed)
        self.assertEqual(self.client.session[DEVICE_ID_SESSION_KEY], device.persistent_id)

    def test_disabling_totp_requires_password_and_current_code(self):
        device = TOTPDevice.objects.create(
            user=self.user,
            name="Authenticator",
            confirmed=True,
            key=TOTP_KEY,
        )
        self.client.force_login(self.user)
        session = self.client.session
        session[DEVICE_ID_SESSION_KEY] = device.persistent_id
        session.save()

        rejected = self.client.post(
            reverse("frekuence_staff:staff_security_disable"),
            {"password": "wrong-password", "otp_token": current_token(device)},
            secure=True,
        )
        self.assertEqual(rejected.status_code, 200)
        self.assertTrue(self.user.totpdevice_set.exists())

        accepted = self.client.post(
            reverse("frekuence_staff:staff_security_disable"),
            {"password": PASSWORD, "otp_token": current_token(device)},
            secure=True,
        )

        self.assertRedirects(
            accepted,
            reverse("frekuence_staff:staff_security"),
            fetch_redirect_response=False,
        )
        self.assertFalse(self.user.totpdevice_set.exists())
        self.assertNotIn(DEVICE_ID_SESSION_KEY, self.client.session)
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.user.pk)


class StaffAccountAdministrationTests(TestCase):
    def setUp(self):
        self.superuser = get_user_model().objects.create_superuser(
            username="account-owner",
            password=PASSWORD,
        )
        self.editor = get_user_model().objects.create_user(
            username="account-editor",
            password=PASSWORD,
            is_staff=True,
        )
        self.editor.groups.add(Group.objects.get(name="Event editors"))

    def test_event_editors_cannot_manage_staff_accounts(self):
        url = reverse("frekuence_staff:staff_access_staffaccount_changelist")
        self.client.force_login(self.editor)
        denied = self.client.get(url, secure=True)
        self.assertEqual(denied.status_code, 403)

        self.client.force_login(self.superuser)
        allowed = self.client.get(url, secure=True)
        self.assertEqual(allowed.status_code, 200)

    def test_superuser_adds_event_editor_and_receives_one_time_setup_link(self):
        self.client.force_login(self.superuser)
        add_url = reverse("frekuence_staff:staff_access_staffaccount_add")
        add_page = self.client.get(add_url, secure=True)
        self.assertContains(add_page, 'name="_save"')
        self.assertNotContains(add_page, 'name="_addanother"')
        self.assertNotContains(add_page, 'name="_continue"')
        self.assertContains(add_page, f'value="{SUPERUSER_ROLE}"')
        response = self.client.post(
            add_url,
            {
                "username": "invited-editor",
                "first_name": "Synthetic",
                "last_name": "Editor",
                "email": "",
                "role": EVENT_EDITOR.code,
                "_save": "Save",
            },
            secure=True,
        )

        self.assertEqual(response.status_code, 200)
        invited = get_user_model().objects.get(username="invited-editor")
        self.assertFalse(invited.has_usable_password())
        self.assertTrue(invited.groups.filter(name="Event editors").exists())
        self.assertContains(response, "#invite=")
        rendered_link = re.search(
            r"https://testserver/staff/setup/#invite=([^<]+)", response.content.decode()
        )
        self.assertIsNotNone(rendered_link)
        self.assertNotIn(rendered_link.group(1), invited.staff_setup_invitations.get().token_digest)

    def test_superuser_can_assign_every_managed_role(self):
        self.client.force_login(self.superuser)

        for role in (EVENT_VIEWER, EVENT_EDITOR, EVENT_MANAGER, STAFF_MANAGER):
            target = get_user_model().objects.create_user(
                username=f"target-{role.code}",
                password=PASSWORD,
                is_staff=True,
            )
            response = self.client.post(
                reverse(
                    "frekuence_staff:staff_access_staffaccount_change",
                    args=(target.pk,),
                ),
                {
                    "username": target.username,
                    "first_name": "",
                    "last_name": "",
                    "email": "",
                    "is_active": "on",
                    "role": role.code,
                    "_save": "Save",
                },
                secure=True,
            )

            self.assertEqual(response.status_code, 302)
            self.assertEqual(set(target.groups.values_list("name", flat=True)), {role.group_name})

    def test_only_a_superuser_can_promote_another_superuser(self):
        target = get_user_model().objects.create_user(
            username="future-superuser",
            password=PASSWORD,
            is_staff=True,
        )
        self.client.force_login(self.superuser)
        response = self.client.post(
            reverse(
                "frekuence_staff:staff_access_staffaccount_change",
                args=(target.pk,),
            ),
            {
                "username": target.username,
                "first_name": "",
                "last_name": "",
                "email": "",
                "is_active": "on",
                "role": SUPERUSER_ROLE,
                "_save": "Save",
            },
            secure=True,
        )

        self.assertEqual(response.status_code, 302)
        target.refresh_from_db()
        self.assertTrue(target.is_superuser)
        self.assertTrue(target.is_staff)
        self.assertFalse(target.groups.exists())

    def test_staff_manager_can_maintain_ordinary_accounts_with_bounded_roles(self):
        manager = get_user_model().objects.create_user(
            username="staff-manager",
            password=PASSWORD,
            is_staff=True,
        )
        assign_staff_role(user=manager, role_code=STAFF_MANAGER.code, actor=self.superuser)
        self.client.force_login(manager)
        changelist = reverse("frekuence_staff:staff_access_staffaccount_changelist")

        page = self.client.get(changelist, secure=True)
        self.assertEqual(page.status_code, 200)
        visible_ids = set(page.context["cl"].queryset.values_list("pk", flat=True))
        self.assertEqual(visible_ids, {self.editor.pk})

        add_url = reverse("frekuence_staff:staff_access_staffaccount_add")
        add_page = self.client.get(add_url, secure=True)
        self.assertNotContains(add_page, f'value="{STAFF_MANAGER.code}"')
        self.assertNotContains(add_page, f'value="{SUPERUSER_ROLE}"')

        created = self.client.post(
            add_url,
            {
                "username": "delegated-editor",
                "first_name": "",
                "last_name": "",
                "email": "",
                "role": EVENT_EDITOR.code,
                "_save": "Save",
            },
            secure=True,
        )
        self.assertEqual(created.status_code, 200)
        delegated = get_user_model().objects.get(username="delegated-editor")
        self.assertFalse(delegated.has_usable_password())
        self.assertEqual(
            set(delegated.groups.values_list("name", flat=True)),
            {EVENT_EDITOR.group_name},
        )
        self.assertContains(created, "#invite=")

        response = self.client.post(
            reverse(
                "frekuence_staff:staff_access_staffaccount_change",
                args=(self.editor.pk,),
            ),
            {
                "username": self.editor.username,
                "first_name": "",
                "last_name": "",
                "email": "",
                "role": EVENT_VIEWER.code,
                "_save": "Save",
            },
            secure=True,
        )
        self.assertEqual(response.status_code, 302)
        self.editor.refresh_from_db()
        self.assertFalse(self.editor.is_active)
        self.assertEqual(
            set(self.editor.groups.values_list("name", flat=True)),
            {EVENT_VIEWER.group_name},
        )

        forbidden_role = self.client.post(
            reverse(
                "frekuence_staff:staff_access_staffaccount_change",
                args=(self.editor.pk,),
            ),
            {
                "username": self.editor.username,
                "first_name": "",
                "last_name": "",
                "email": "",
                "is_active": "on",
                "role": STAFF_MANAGER.code,
                "_save": "Save",
            },
            secure=True,
        )
        self.assertEqual(forbidden_role.status_code, 200)
        self.assertContains(forbidden_role, "Select a valid choice")
        self.editor.refresh_from_db()
        self.assertFalse(self.editor.is_active)
        self.assertEqual(
            set(self.editor.groups.values_list("name", flat=True)),
            {EVENT_VIEWER.group_name},
        )

    def test_staff_manager_cannot_reach_equal_or_superuser_accounts(self):
        manager = get_user_model().objects.create_user(
            username="bounded-manager",
            password=PASSWORD,
            is_staff=True,
        )
        assign_staff_role(user=manager, role_code=STAFF_MANAGER.code, actor=self.superuser)
        peer_manager = get_user_model().objects.create_user(
            username="peer-manager",
            password=PASSWORD,
            is_staff=True,
        )
        assign_staff_role(
            user=peer_manager,
            role_code=STAFF_MANAGER.code,
            actor=self.superuser,
        )
        self.client.force_login(manager)

        changelist = self.client.get(
            reverse("frekuence_staff:staff_access_staffaccount_changelist"),
            secure=True,
        )
        visible_ids = set(changelist.context["cl"].queryset.values_list("pk", flat=True))
        self.assertNotIn(self.superuser.pk, visible_ids)
        self.assertNotIn(peer_manager.pk, visible_ids)

        for protected_target in (self.superuser, peer_manager):
            change_url = reverse(
                "frekuence_staff:staff_access_staffaccount_change",
                args=(protected_target.pk,),
            )
            reset_url = reverse(
                "frekuence_staff:staff_access_staffaccount_reset_access",
                args=(protected_target.pk,),
            )
            self.assertNotEqual(self.client.get(change_url, secure=True).status_code, 200)
            self.assertEqual(self.client.get(reset_url, secure=True).status_code, 404)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_active)
        self.assertTrue(self.superuser.is_superuser)

    def test_staff_accounts_are_deactivated_instead_of_deleted(self):
        self.client.force_login(self.superuser)
        delete_url = reverse(
            "frekuence_staff:staff_access_staffaccount_delete",
            args=(self.editor.pk,),
        )

        response = self.client.get(delete_url, secure=True)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(get_user_model().objects.filter(pk=self.editor.pk).exists())

    def test_superuser_can_reset_another_account_but_not_their_own(self):
        device = TOTPDevice.objects.create(user=self.editor, name="Authenticator", confirmed=True)
        self.client.force_login(self.superuser)
        target_url = reverse(
            "frekuence_staff:staff_access_staffaccount_reset_access",
            args=(self.editor.pk,),
        )
        response = self.client.post(target_url, {"password": PASSWORD}, secure=True)

        self.assertEqual(response.status_code, 200)
        self.editor.refresh_from_db()
        self.assertFalse(self.editor.has_usable_password())
        self.assertFalse(TOTPDevice.objects.filter(pk=device.pk).exists())
        self.assertContains(response, "#invite=")

        self_url = reverse(
            "frekuence_staff:staff_access_staffaccount_reset_access",
            args=(self.superuser.pk,),
        )
        rejected = self.client.get(self_url, secure=True)
        self.assertRedirects(
            rejected,
            reverse(
                "frekuence_staff:staff_access_staffaccount_change",
                args=(self.superuser.pk,),
            ),
            fetch_redirect_response=False,
        )
