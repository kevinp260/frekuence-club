from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Event


@receiver(post_delete, sender=Event)
def delete_event_media(sender, instance, **kwargs):
    storage = instance.poster.storage
    media_names = instance.media_names()
    transaction.on_commit(lambda: [storage.delete(name) for name in media_names])
