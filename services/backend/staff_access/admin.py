from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.http import Http404, HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django_otp import user_has_device, verify_token

from .forms import AdminResetAccessForm, StaffAccountChangeForm, StaffAccountCreationForm
from .models import StaffAccount
from .roles import (
    STAFF_MANAGER,
    assign_staff_role,
    can_manage_staff_accounts,
    can_manage_staff_target,
    role_choices_for_actor,
    role_label_for_user,
)
from .services import issue_invitation
from .site import staff_admin_site


@admin.register(StaffAccount, site=staff_admin_site)
class StaffAccountAdmin(admin.ModelAdmin):
    add_form = StaffAccountCreationForm
    form = StaffAccountChangeForm
    change_form_template = "staff_access/staffaccount_change_form.html"
    list_display = (
        "username",
        "display_name",
        "is_active",
        "account_role",
        "two_factor_status",
        "last_login",
    )
    search_fields = ("username", "first_name", "last_name", "email")
    ordering = ("username",)
    readonly_fields = ("last_login", "date_joined", "account_role", "two_factor_status")
    fieldsets = (
        ("Identity", {"fields": ("username", "first_name", "last_name", "email")}),
        ("Access", {"fields": ("is_active", "role", "two_factor_status")}),
        ("History", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            "Staff member",
            {"fields": ("username", "first_name", "last_name", "email", "role")},
        ),
    )

    def get_queryset(self, request):
        queryset = (
            super()
            .get_queryset(request)
            .filter(is_staff=True)
            .prefetch_related("groups", "totpdevice_set")
        )
        if request.user.is_superuser:
            return queryset
        return (
            queryset.filter(is_superuser=False)
            .exclude(pk=request.user.pk)
            .exclude(groups__name=STAFF_MANAGER.group_name)
            .distinct()
        )

    def has_module_permission(self, request):
        return can_manage_staff_accounts(request.user)

    def has_view_permission(self, request, obj=None):
        return can_manage_staff_target(request.user, obj)

    def has_add_permission(self, request):
        return can_manage_staff_accounts(request.user)

    def has_change_permission(self, request, obj=None):
        return can_manage_staff_target(request.user, obj)

    def has_delete_permission(self, request, obj=None):
        return False

    def get_form(self, request, obj=None, **kwargs):
        kwargs["form"] = self.add_form if obj is None else self.form
        form = super().get_form(request, obj, **kwargs)
        form.base_fields["role"].choices = role_choices_for_actor(request.user, obj)
        return form

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)

    def render_change_form(self, request, context, *args, **kwargs):
        context["show_save_and_add_another"] = False
        context["show_save_and_continue"] = False
        return super().render_change_form(request, context, *args, **kwargs)

    def save_model(self, request, obj, form, change):
        if change and not can_manage_staff_target(request.user, obj):
            raise PermissionDenied("You cannot manage this staff account.")
        if change and obj.pk == request.user.pk and not obj.is_active:
            obj.is_active = True
            messages.error(request, "You cannot deactivate your own account.")
        super().save_model(request, obj, form, change)
        assign_staff_role(user=obj, role_code=form.cleaned_data["role"], actor=request.user)

    def response_add(self, request, obj, post_url_continue=None):
        issued = issue_invitation(user=obj, created_by=request.user)
        return self._invitation_response(request, obj, issued)

    def get_urls(self):
        return [
            path(
                "<path:object_id>/reset-access/",
                self.admin_site.admin_view(self.reset_access),
                name="staff_access_staffaccount_reset_access",
            ),
            *super().get_urls(),
        ]

    def reset_access(self, request, object_id):
        target = self.get_object(request, object_id)
        if target is None:
            raise Http404
        if not can_manage_staff_target(request.user, target):
            raise Http404
        if target.pk == request.user.pk:
            messages.error(request, "Use Account security to change your own two-factor settings.")
            return HttpResponseRedirect(
                reverse("frekuence_staff:staff_access_staffaccount_change", args=(target.pk,))
            )

        form = AdminResetAccessForm(request.POST or None, request=request)
        if request.method == "POST" and form.is_valid():
            if user_has_device(request.user, confirmed=True):
                device = request.user.totpdevice_set.filter(confirmed=True).first()
                verified = (
                    verify_token(
                        request.user,
                        device.persistent_id,
                        form.cleaned_data.get("otp_token", ""),
                    )
                    if device is not None
                    else None
                )
                if verified is None:
                    form.add_error("otp_token", "The authenticator code was not accepted.")
                else:
                    issued = issue_invitation(
                        user=target,
                        created_by=request.user,
                        reset_access=True,
                    )
                    self.log_change(request, target, "Reset staff access and issued a setup link.")
                    return self._invitation_response(request, target, issued)
            else:
                issued = issue_invitation(
                    user=target,
                    created_by=request.user,
                    reset_access=True,
                )
                self.log_change(request, target, "Reset staff access and issued a setup link.")
                return self._invitation_response(request, target, issued)

        return TemplateResponse(
            request,
            "staff_access/reset_access.html",
            {
                **self.admin_site.each_context(request),
                "title": "Reset staff access",
                "target": target,
                "form": form,
                "opts": self.model._meta,
            },
            headers={"Cache-Control": "no-store"},
        )

    def _invitation_response(self, request, target, issued):
        setup_url = request.build_absolute_uri(reverse("frekuence_staff:staff_setup"))
        invitation_url = f"{setup_url}#invite={issued.fragment_value}"
        return TemplateResponse(
            request,
            "staff_access/invitation_ready.html",
            {
                **self.admin_site.each_context(request),
                "title": "Staff setup link ready",
                "target": target,
                "invitation_url": invitation_url,
                "expires_at": issued.invitation.expires_at,
                "opts": self.model._meta,
            },
            headers={"Cache-Control": "no-store"},
        )

    @admin.display(description="Name")
    def display_name(self, obj):
        return obj.get_full_name() or "—"

    @admin.display(description="Role")
    def account_role(self, obj):
        return role_label_for_user(obj)

    @admin.display(description="2FA")
    def two_factor_status(self, obj):
        return "Enabled" if obj.totpdevice_set.filter(confirmed=True).exists() else "Optional — off"
