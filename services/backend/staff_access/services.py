import secrets
from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from .models import StaffSetupInvitation
from .roles import can_manage_staff_accounts, can_manage_staff_target

INVITATION_LIFETIME = timedelta(hours=24)


@dataclass(frozen=True)
class IssuedInvitation:
    invitation: StaffSetupInvitation
    token: str

    @property
    def fragment_value(self):
        return f"{self.invitation.pk}.{self.token}"


def _token_digest(token):
    return salted_hmac(
        "frekuence.staff-setup-invitation",
        token,
        secret=settings.SECRET_KEY,
        algorithm="sha256",
    ).hexdigest()


@transaction.atomic
def issue_invitation(*, user, created_by, reset_access=False):
    if not can_manage_staff_accounts(created_by) or not can_manage_staff_target(created_by, user):
        raise PermissionDenied("You cannot issue a setup invitation for this staff account.")
    if not user.is_staff or not user.is_active:
        raise ValueError("Setup invitations require an active staff account.")

    locked_user = get_user_model().objects.select_for_update().get(pk=user.pk)
    now = timezone.now()
    StaffSetupInvitation.objects.filter(
        user=locked_user,
        claimed_at__isnull=True,
        revoked_at__isnull=True,
    ).update(revoked_at=now)
    if reset_access:
        locked_user.set_unusable_password()
        locked_user.save(update_fields=("password",))
        locked_user.totpdevice_set.all().delete()

    token = secrets.token_urlsafe(32)
    invitation = StaffSetupInvitation.objects.create(
        user=locked_user,
        created_by=created_by,
        token_digest=_token_digest(token),
        expires_at=now + INVITATION_LIFETIME,
    )
    return IssuedInvitation(invitation=invitation, token=token)


@transaction.atomic
def claim_invitation(payload):
    try:
        invitation_id, token = payload.split(".", 1)
        invitation_uuid = UUID(invitation_id)
    except (AttributeError, TypeError, ValueError):
        return None
    if len(token) < 32 or len(token) > 128:
        return None

    invitation = (
        StaffSetupInvitation.objects.select_for_update()
        .select_related("user")
        .filter(pk=invitation_uuid)
        .first()
    )
    now = timezone.now()
    if (
        invitation is None
        or invitation.claimed_at is not None
        or invitation.revoked_at is not None
        or invitation.expires_at <= now
        or not invitation.user.is_active
        or not invitation.user.is_staff
        or not constant_time_compare(invitation.token_digest, _token_digest(token))
    ):
        return None

    invitation.claimed_at = now
    invitation.save(update_fields=("claimed_at",))
    return invitation
