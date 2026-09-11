from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.utils.html import format_html, format_html_join
from django_otp.admin import OTPAdminSite

from .forms import EventAdminForm
from .models import Event
from .services import (
    publish_event_from_request,
    save_event_from_request,
    unpublish_event_from_request,
)


class FrekuenceStaffAdminSite(OTPAdminSite):
    site_header = "Frekuence staff"
    site_title = "Frekuence staff"
    index_title = "Event management"
    site_url = None


staff_admin_site = FrekuenceStaffAdminSite(name="frekuence_staff")


@admin.register(Event, site=staff_admin_site)
class EventAdmin(admin.ModelAdmin):
    form = EventAdminForm
    list_display = (
        "title_sq",
        "starts_at",
        "event_status",
        "publication_status",
        "is_featured",
        "updated_at",
    )
    list_filter = ("publication_status", "event_status", "is_featured", "starts_at")
    search_fields = ("title_sq", "title_en", "lineup")
    ordering = ("starts_at",)
    date_hierarchy = "starts_at"
    actions = ("publish_selected", "unpublish_selected")
    readonly_fields = (
        "id",
        "poster_preview",
        "poster_metadata_display",
        "published_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )
    fieldsets = (
        ("Identity", {"fields": ("id", "slug")}),
        (
            "Albanian",
            {
                "fields": (
                    "title_sq",
                    "summary_sq",
                    "description_sq",
                    "poster_alt_sq",
                    "entry_note_sq",
                )
            },
        ),
        (
            "English",
            {
                "fields": (
                    "title_en",
                    "summary_en",
                    "description_en",
                    "poster_alt_en",
                    "entry_note_en",
                )
            },
        ),
        (
            "Schedule",
            {"fields": ("starts_at", "ends_at", "doors_at", "lineup_text", "event_status")},
        ),
        ("Poster", {"fields": ("poster", "poster_preview", "poster_metadata_display")}),
        ("Publication", {"fields": ("publication_status", "is_featured", "published_at")}),
        (
            "Audit",
            {
                "classes": ("collapse",),
                "fields": ("created_at", "updated_at", "created_by", "updated_by"),
            },
        ),
    )

    @admin.display(description="Processed poster")
    def poster_preview(self, event):
        if not event.poster_480:
            return "No processed poster"
        return format_html(
            '<img src="{}" alt="" style="max-width:240px;height:auto;border:1px solid #777">',
            event.poster_480.url,
        )

    @admin.display(description="Poster metadata")
    def poster_metadata_display(self, event):
        if not event.poster_metadata:
            return "Not processed"
        original = event.poster_metadata.get("original", {})
        derivatives = event.poster_metadata.get("derivatives", {})
        rows = [
            (
                "Managed original",
                original.get("width", "—"),
                original.get("height", "—"),
                original.get("format", "—"),
            )
        ]
        for field_name in ("poster_480", "poster_960", "poster_1440", "poster_social"):
            metadata = derivatives.get(field_name, {})
            rows.append(
                (
                    field_name.replace("poster_", "").replace("_", " ").title(),
                    metadata.get("width", "—"),
                    metadata.get("height", "—"),
                    metadata.get("format", "—"),
                )
            )
        return format_html(
            '<dl class="poster-metadata">{}</dl>',
            format_html_join(
                "",
                "<div><dt>{}</dt><dd>{} &times; {} &middot; {}</dd></div>",
                rows,
            ),
        )

    def save_model(self, request, obj, form, change):
        save_event_from_request(obj, request.user)

    @admin.action(description="Publish selected events after validation")
    def publish_selected(self, request, queryset):
        published = 0
        for event in queryset:
            try:
                publish_event_from_request(event, request.user)
            except ValidationError as error:
                self.message_user(request, f"{event}: {error}", level=messages.ERROR)
            else:
                published += 1
        if published:
            self.message_user(request, f"Published {published} event(s).", level=messages.SUCCESS)

    @admin.action(description="Return selected events to draft")
    def unpublish_selected(self, request, queryset):
        for event in queryset:
            unpublish_event_from_request(event, request.user)
        self.message_user(
            request, f"Unpublished {queryset.count()} event(s).", level=messages.SUCCESS
        )
