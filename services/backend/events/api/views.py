import hashlib
from urllib.parse import urlencode

from django.urls import reverse
from django.utils import timezone
from django.utils.cache import get_conditional_response, patch_cache_control
from django.utils.http import quote_etag
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from events.models import Event

from .serializers import (
    EventDetailQuerySerializer,
    EventListQuerySerializer,
    PublicEventDetailSerializer,
    PublicEventListSerializer,
)

PUBLIC_CACHE_SECONDS = 60
PUBLIC_STALE_WHILE_REVALIDATE_SECONDS = 300
PUBLIC_EVENT_FIELDS = (
    "slug",
    "title_sq",
    "title_en",
    "summary_sq",
    "summary_en",
    "description_sq",
    "description_en",
    "starts_at",
    "ends_at",
    "doors_at",
    "lineup",
    "poster_480",
    "poster_960",
    "poster_1440",
    "poster_social",
    "poster_metadata",
    "poster_alt_sq",
    "poster_alt_en",
    "event_status",
    "is_featured",
    "entry_note_sq",
    "entry_note_en",
)


def _published_events():
    return Event.objects.published().only(*PUBLIC_EVENT_FIELDS)


def _validated_query(query_params, serializer_class):
    serializer = serializer_class(data=query_params)
    allowed = set(serializer.fields)
    unknown = sorted(set(query_params) - allowed)
    repeated = sorted(name for name in allowed if len(query_params.getlist(name)) > 1)
    errors = []
    if unknown:
        errors.append(f"Unsupported query parameter(s): {', '.join(unknown)}.")
    if repeated:
        errors.append(f"Query parameter(s) must appear once: {', '.join(repeated)}.")
    if errors:
        raise ValidationError({"query": errors})
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def _page_link(*, locale, event_window, limit, offset):
    query = urlencode(
        (
            ("locale", locale),
            ("when", event_window),
            ("limit", limit),
            ("offset", offset),
        )
    )
    return f"{reverse('events-api-v1:event-list')}?{query}"


class PublicEventAPIView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    parser_classes = ()
    renderer_classes = (JSONRenderer,)
    http_method_names = ("get", "head", "options")

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if request.method in {"GET", "HEAD"} and response.status_code == status.HTTP_200_OK:
            response.render()
            etag = quote_etag(hashlib.sha256(response.content).hexdigest())
            response.headers["ETag"] = etag
            patch_cache_control(
                response,
                public=True,
                max_age=PUBLIC_CACHE_SECONDS,
                stale_while_revalidate=PUBLIC_STALE_WHILE_REVALIDATE_SECONDS,
            )
            return get_conditional_response(
                request._request,
                etag=etag,
                response=response,
            )
        response.headers["Cache-Control"] = "no-store"
        return response


class EventListAPIView(PublicEventAPIView):
    def get(self, request):
        query = _validated_query(request.query_params, EventListQuerySerializer)
        at = timezone.now()
        events = _published_events()
        if query["when"] == "upcoming":
            events = events.filter(ends_at__gt=at).order_by("starts_at", "pk")
        else:
            events = events.filter(ends_at__lte=at).order_by("-starts_at", "-pk")

        count = events.count()
        offset = query["offset"]
        limit = query["limit"]
        page = list(events[offset : offset + limit])
        context = {"at": at, "locale": query["locale"]}
        results = PublicEventListSerializer(page, many=True, context=context).data
        next_offset = offset + limit
        previous_offset = max(0, offset - limit)
        return Response(
            {
                "count": count,
                "next": (
                    _page_link(
                        locale=query["locale"],
                        event_window=query["when"],
                        limit=limit,
                        offset=next_offset,
                    )
                    if next_offset < count
                    else None
                ),
                "previous": (
                    _page_link(
                        locale=query["locale"],
                        event_window=query["when"],
                        limit=limit,
                        offset=previous_offset,
                    )
                    if offset > 0
                    else None
                ),
                "results": results,
            }
        )


class EventDetailAPIView(PublicEventAPIView):
    def get(self, request, slug):
        query = _validated_query(request.query_params, EventDetailQuerySerializer)
        try:
            event = _published_events().get(slug=slug)
        except Event.DoesNotExist as error:
            raise NotFound("Event not found.") from error

        context = {"at": timezone.now(), "locale": query["locale"]}
        return Response(PublicEventDetailSerializer(event, context=context).data)
