import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models


class StaffAccount(User):
    class Meta:
        proxy = True
        verbose_name = "Staff account"
        verbose_name_plural = "Staff accounts"
        default_permissions = ()
        permissions = (("manage_staff_accounts", "Can manage ordinary staff accounts"),)


class StaffSetupInvitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_setup_invitations",
    )
    token_digest = models.CharField(max_length=64, unique=True, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_staff_setup_invitations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    claimed_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(
                fields=("user", "expires_at"),
                name="staff_setup_user_expiry_idx",
            ),
        )

    def __str__(self):
        return f"Staff setup invitation for {self.user.get_username()}"
