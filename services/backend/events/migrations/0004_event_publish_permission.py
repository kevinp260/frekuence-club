from django.db import migrations


def create_publish_permission(apps, schema_editor):
    content_type_model = apps.get_model("contenttypes", "ContentType")
    permission_model = apps.get_model("auth", "Permission")
    database = schema_editor.connection.alias
    content_type, _created = content_type_model.objects.using(database).get_or_create(
        app_label="events",
        model="event",
    )
    permission_model.objects.using(database).get_or_create(
        content_type=content_type,
        codename="publish_event",
        defaults={"name": "Can publish event"},
    )


def delete_publish_permission(apps, schema_editor):
    apps.get_model("auth", "Permission").objects.using(schema_editor.connection.alias).filter(
        content_type__app_label="events",
        content_type__model="event",
        codename="publish_event",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("events", "0003_event_event_published_content_complete")]

    operations = [
        migrations.AlterModelOptions(
            name="event",
            options={
                "ordering": ["starts_at", "title_sq"],
                "permissions": [("publish_event", "Can publish event")],
            },
        ),
        migrations.RunPython(create_publish_permission, delete_publish_permission),
    ]
