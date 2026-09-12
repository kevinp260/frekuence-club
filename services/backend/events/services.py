import logging

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from .models import Event

audit_log = logging.getLogger("events.audit")


def select_homepage_primary(at=None):
    """Return the deliberate featured event or earliest eligible current/upcoming event."""
    candidates = Event.objects.published().current_or_future(at).order_by("starts_at", "pk")
    return candidates.filter(is_featured=True).first() or candidates.first()


def _require_event_permission(user, event, previous_state=None):
    permission = "events.add_event" if event._state.adding else "events.change_event"
    if not user.is_authenticated or not user.is_active or not user.is_staff:
        raise PermissionDenied("Active staff access is required.")
    if not user.has_perm(permission):
        raise PermissionDenied("You do not have permission to save this event.")
    if user.has_perm("events.publish_event"):
        return
    was_published = bool(
        previous_state and previous_state["publication_status"] == Event.PublicationStatus.PUBLISHED
    )
    publication_changed = bool(
        previous_state
        and (
            previous_state["publication_status"] != event.publication_status
            or previous_state["is_featured"] != event.is_featured
        )
    )
    if (
        was_published
        or publication_changed
        or event.publication_status == Event.PublicationStatus.PUBLISHED
        or event.is_featured
    ):
        raise PermissionDenied("Event manager access is required to publish public changes.")


@transaction.atomic
def save_event_from_request(event, user):
    is_new = event._state.adding
    previous_state = None
    if not is_new:
        previous_state = (
            Event.objects.select_for_update()
            .filter(pk=event.pk)
            .values("publication_status", "event_status", "is_featured")
            .get()
        )
    _require_event_permission(user, event, previous_state)
    if is_new:
        event.created_by = user
    event.updated_by = user

    if event.is_featured:
        replaced_count = (
            Event.objects.select_for_update()
            .filter(is_featured=True)
            .exclude(pk=event.pk)
            .update(
                is_featured=False,
                updated_by=user,
                updated_at=timezone.now(),
            )
        )
        if replaced_count:
            audit_log.info(
                "featured_event_replaced replacement_event_id=%s actor_id=%s replaced_count=%s",
                event.pk,
                user.pk,
                replaced_count,
            )
    event.save()
    audit_log.info(
        "event_saved event_id=%s actor_id=%s previous_state=%s publication=%s lifecycle=%s "
        "featured=%s",
        event.pk,
        user.pk,
        previous_state,
        event.publication_status,
        event.event_status,
        event.is_featured,
    )
    return event


@transaction.atomic
def publish_event_from_request(event, user):
    event.publication_status = Event.PublicationStatus.PUBLISHED
    return save_event_from_request(event, user)


@transaction.atomic
def unpublish_event_from_request(event, user):
    event.publication_status = Event.PublicationStatus.DRAFT
    event.is_featured = False
    return save_event_from_request(event, user)
