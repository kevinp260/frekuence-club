from django.urls import path

from .views import EventDetailAPIView, EventListAPIView

app_name = "events-api-v1"

urlpatterns = [
    path("events/", EventListAPIView.as_view(), name="event-list"),
    path("events/<slug:slug>/", EventDetailAPIView.as_view(), name="event-detail"),
]
