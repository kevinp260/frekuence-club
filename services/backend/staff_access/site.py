import base64
import io
import logging
import time

import qrcode
from django.contrib import admin, messages
from django.contrib.auth import login as auth_login
from django.contrib.auth import update_session_auth_hash
from django.db import transaction
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django_otp import DEVICE_ID_SESSION_KEY, user_has_device, verify_token
from django_otp import login as otp_login
from django_otp.admin import OTPAdminSite
from django_otp.plugins.otp_totp.models import TOTPDevice

from .forms import (
    DisableTOTPForm,
    OTPVerificationForm,
    StaffPasswordLoginForm,
    StaffSetupPasswordForm,
)
from .services import claim_invitation

PARTIAL_AUTH_KEY = "frekuence_staff_partial_auth"
SETUP_USER_KEY = "frekuence_staff_setup_user"
FLOW_LIFETIME_SECONDS = 15 * 60
OTP_MAX_ATTEMPTS = 5
audit_logger = logging.getLogger("staff_access.audit")


def _safe_next(request, candidate):
    if candidate and url_has_allowed_host_and_scheme(
        candidate,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return candidate
    return reverse("frekuence_staff:index")


def _flow_state(request, key):
    state = request.session.get(key)
    if not isinstance(state, dict):
        return None
    if int(time.time()) - state.get("created_at", 0) > FLOW_LIFETIME_SECONDS:
        request.session.pop(key, None)
        return None
    return state


def _qr_data_url(device):
    payload = io.BytesIO()
    image = qrcode.make(device.config_url)
    image.save(payload, format="PNG")
    image.close()
    encoded = base64.b64encode(payload.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


class FrekuenceStaffAdminSite(OTPAdminSite):
    site_header = "Frekuence staff"
    site_title = "Frekuence staff"
    index_title = "Event management"
    site_url = None
    login_form = StaffPasswordLoginForm
    login_template = "staff_access/login_password.html"

    def has_permission(self, request):
        has_admin_access = admin.AdminSite.has_permission(self, request)
        if not has_admin_access:
            return False
        return not user_has_device(request.user, confirmed=True) or request.user.is_verified()

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("login/verify/", self.login_verify, name="login_verify"),
            path("setup/", self.setup_landing, name="staff_setup"),
            path("setup/claim/", self.setup_claim, name="staff_setup_claim"),
            path("setup/account/", self.setup_account, name="staff_setup_account"),
            path("setup/authenticator/", self.setup_totp, name="staff_setup_totp"),
            path("security/", self.admin_view(self.security), name="staff_security"),
            path(
                "security/enable/",
                self.admin_view(self.security_enable),
                name="staff_security_enable",
            ),
            path(
                "security/disable/",
                self.admin_view(self.security_disable),
                name="staff_security_disable",
            ),
        ]
        return custom_urls + urls

    def _context(self, request, **extra):
        return {**self.each_context(request), **extra}

    def login(self, request, extra_context=None):
        if request.user.is_authenticated and self.has_permission(request):
            return redirect("frekuence_staff:index")

        form = self.login_form(request, data=request.POST or None)
        if request.method == "POST" and form.is_valid():
            user = form.get_user()
            next_url = _safe_next(request, request.POST.get("next"))
            device = TOTPDevice.objects.filter(user=user, confirmed=True).order_by("pk").first()
            if device is not None:
                request.session.cycle_key()
                request.session[PARTIAL_AUTH_KEY] = {
                    "user_id": user.pk,
                    "backend": getattr(
                        user,
                        "backend",
                        "django.contrib.auth.backends.ModelBackend",
                    ),
                    "device_id": device.persistent_id,
                    "created_at": int(time.time()),
                    "failed_attempts": 0,
                    "next": next_url,
                }
                return redirect("frekuence_staff:login_verify")

            auth_login(request, user)
            return HttpResponseRedirect(next_url)

        context = self._context(
            request,
            title="Staff sign in",
            form=form,
            next=request.GET.get("next", request.POST.get("next", "")),
            **(extra_context or {}),
        )
        response = TemplateResponse(request, self.login_template, context)
        response.headers["Cache-Control"] = "no-store"
        return response

    def login_verify(self, request):
        state = _flow_state(request, PARTIAL_AUTH_KEY)
        if state is None:
            messages.info(request, "Start again with your username and password.")
            return redirect("frekuence_staff:login")
        user = self._user_for_flow(state)
        if user is None:
            request.session.pop(PARTIAL_AUTH_KEY, None)
            return redirect("frekuence_staff:login")

        form = OTPVerificationForm(request.POST or None)
        if request.method == "POST" and form.is_valid():
            verified_device = verify_token(
                user,
                state.get("device_id", ""),
                form.cleaned_data["otp_token"],
            )
            if verified_device is None:
                failed_attempts = state.get("failed_attempts", 0) + 1
                if failed_attempts >= OTP_MAX_ATTEMPTS:
                    request.session.pop(PARTIAL_AUTH_KEY, None)
                    messages.error(
                        request,
                        "Too many authenticator attempts. Sign in with your password again.",
                    )
                    return redirect("frekuence_staff:login")
                state["failed_attempts"] = failed_attempts
                request.session[PARTIAL_AUTH_KEY] = state
                form.add_error("otp_token", "The authenticator code was not accepted.")
            else:
                next_url = state["next"]
                backend = state["backend"]
                request.session.pop(PARTIAL_AUTH_KEY, None)
                auth_login(request, user, backend=backend)
                otp_login(request, verified_device)
                return HttpResponseRedirect(next_url)

        response = TemplateResponse(
            request,
            "staff_access/login_otp.html",
            self._context(
                request,
                title="Verify your sign in",
                subtitle="Enter the current code from your authenticator app.",
                form=form,
            ),
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    @staticmethod
    def _user_for_flow(state):
        from django.contrib.auth import get_user_model

        return (
            get_user_model()
            .objects.filter(pk=state.get("user_id"), is_active=True, is_staff=True)
            .first()
        )

    def setup_landing(self, request):
        response = TemplateResponse(
            request,
            "staff_access/setup_landing.html",
            self._context(request, title="Set up your staff account"),
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    def setup_claim(self, request):
        if request.method != "POST":
            return redirect("frekuence_staff:staff_setup")
        invitation = claim_invitation(request.POST.get("invitation"))
        if invitation is None:
            return TemplateResponse(
                request,
                "staff_access/setup_invalid.html",
                self._context(request, title="Setup link unavailable"),
                status=400,
                headers={"Cache-Control": "no-store"},
            )
        request.session.flush()
        request.session[SETUP_USER_KEY] = {
            "user_id": invitation.user_id,
            "created_at": int(time.time()),
        }
        return redirect("frekuence_staff:staff_setup_account")

    def setup_account(self, request):
        state = _flow_state(request, SETUP_USER_KEY)
        user = self._user_for_flow(state or {})
        if user is None:
            return redirect("frekuence_staff:staff_setup")
        form = StaffSetupPasswordForm(user, request.POST or None)
        if request.method == "POST" and form.is_valid():
            user = form.save()
            if form.cleaned_data["enable_totp"]:
                TOTPDevice.objects.filter(user=user, confirmed=False).delete()
                device = TOTPDevice.objects.create(
                    user=user,
                    name="Authenticator",
                    confirmed=False,
                )
                state["device_id"] = device.pk
                request.session[SETUP_USER_KEY] = state
                return redirect("frekuence_staff:staff_setup_totp")
            return self._finish_setup_login(request, user, None)

        response = TemplateResponse(
            request,
            "staff_access/setup_account.html",
            self._context(
                request,
                title="Choose your password",
                subtitle="You can protect this account with an authenticator in the next step.",
                form=form,
            ),
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    def setup_totp(self, request):
        state = _flow_state(request, SETUP_USER_KEY)
        user = self._user_for_flow(state or {})
        device = (
            TOTPDevice.objects.filter(
                pk=(state or {}).get("device_id"), user=user, confirmed=False
            ).first()
            if user is not None
            else None
        )
        if user is None or device is None:
            return redirect("frekuence_staff:staff_setup")
        form = OTPVerificationForm(request.POST or None)
        if request.method == "POST" and form.is_valid():
            with transaction.atomic():
                locked = TOTPDevice.objects.select_for_update().get(
                    pk=device.pk,
                    confirmed=False,
                )
                if locked.verify_token(form.cleaned_data["otp_token"]):
                    locked.confirmed = True
                    locked.save(update_fields=("confirmed",))
                    return self._finish_setup_login(request, user, locked)
            form.add_error("otp_token", "The authenticator code was not accepted.")

        response = TemplateResponse(
            request,
            "staff_access/setup_totp.html",
            self._context(
                request,
                title="Connect your authenticator",
                subtitle="Scan the QR, then enter the six-digit code to confirm setup.",
                form=form,
                qr_data_url=_qr_data_url(device),
                manual_key=base64.b32encode(device.bin_key).decode("ascii").rstrip("="),
            ),
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    @staticmethod
    def _finish_setup_login(request, user, device):
        request.session.pop(SETUP_USER_KEY, None)
        auth_login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        if device is not None:
            otp_login(request, device)
        return redirect("frekuence_staff:index")

    def security(self, request):
        device = TOTPDevice.objects.filter(user=request.user, confirmed=True).first()
        return TemplateResponse(
            request,
            "staff_access/security.html",
            self._context(
                request,
                title="Account security",
                device=device,
            ),
            headers={"Cache-Control": "no-store"},
        )

    def security_enable(self, request):
        if TOTPDevice.objects.filter(user=request.user, confirmed=True).exists():
            return redirect("frekuence_staff:staff_security")
        device = TOTPDevice.objects.filter(user=request.user, confirmed=False).first()
        if device is None:
            device = TOTPDevice.objects.create(
                user=request.user, name="Authenticator", confirmed=False
            )
        form = OTPVerificationForm(request.POST or None)
        if request.method == "POST" and form.is_valid():
            with transaction.atomic():
                locked = TOTPDevice.objects.select_for_update().get(
                    pk=device.pk,
                    confirmed=False,
                )
                if locked.verify_token(form.cleaned_data["otp_token"]):
                    locked.confirmed = True
                    locked.save(update_fields=("confirmed",))
                    audit_logger.info("staff_totp_enabled actor_id=%s", request.user.pk)
                    otp_login(request, locked)
                    messages.success(request, "Two-factor authentication is now enabled.")
                    return redirect("frekuence_staff:staff_security")
            form.add_error("otp_token", "The authenticator code was not accepted.")

        return TemplateResponse(
            request,
            "staff_access/setup_totp.html",
            self._context(
                request,
                title="Enable two-factor authentication",
                subtitle="Scan the QR, then enter the six-digit code to confirm setup.",
                form=form,
                qr_data_url=_qr_data_url(device),
                manual_key=base64.b32encode(device.bin_key).decode("ascii").rstrip("="),
            ),
            headers={"Cache-Control": "no-store"},
        )

    def security_disable(self, request):
        device = TOTPDevice.objects.filter(user=request.user, confirmed=True).first()
        if device is None:
            return redirect("frekuence_staff:staff_security")
        form = DisableTOTPForm(request.POST or None, request=request)
        if request.method == "POST" and form.is_valid():
            verified = verify_token(
                request.user,
                device.persistent_id,
                form.cleaned_data["otp_token"],
            )
            if verified is None:
                form.add_error("otp_token", "The authenticator code was not accepted.")
            else:
                password = form.cleaned_data["password"]
                TOTPDevice.objects.filter(user=request.user).delete()
                request.user.set_password(password)
                request.user.save(update_fields=("password",))
                update_session_auth_hash(request, request.user)
                request.session.pop(DEVICE_ID_SESSION_KEY, None)
                audit_logger.info("staff_totp_disabled actor_id=%s", request.user.pk)
                messages.success(request, "Two-factor authentication is now disabled.")
                return redirect("frekuence_staff:staff_security")

        return TemplateResponse(
            request,
            "staff_access/security_disable.html",
            self._context(
                request,
                title="Disable two-factor authentication",
                subtitle="Confirm your password and current authenticator code.",
                form=form,
            ),
            headers={"Cache-Control": "no-store"},
        )


staff_admin_site = FrekuenceStaffAdminSite(name="frekuence_staff")
