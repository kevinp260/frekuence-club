from django.db import migrations


ROLE_PERMISSIONS = {
    "Event viewers": ("view_event",),
    "Event editors": ("view_event", "add_event", "change_event"),
    "Event managers": (
        "view_event",
        "add_event",
        "change_event",
        "delete_event",
        "publish_event",
    ),
    "Staff managers": (
        "view_event",
        "add_event",
        "change_event",
        "delete_event",
        "publish_event",
        "manage_staff_accounts",
    ),
}


def configure_staff_roles(apps, schema_editor):
    content_type_model = apps.get_model("contenttypes", "ContentType")
    permission_model = apps.get_model("auth", "Permission")
    group_model = apps.get_model("auth", "Group")
    database = schema_editor.connection.alias

    event_content_type, _created = content_type_model.objects.using(database).get_or_create(
        app_label="events",
        model="event",
    )
    staff_content_type, _created = content_type_model.objects.using(database).get_or_create(
        app_label="staff_access",
        model="staffaccount",
    )
    event_permissions = {}
    for action in ("view", "add", "change", "delete", "publish"):
        codename = f"{action}_event"
        permission, _created = permission_model.objects.using(database).get_or_create(
            content_type=event_content_type,
            codename=codename,
            defaults={"name": f"Can {action} event"},
        )
        event_permissions[codename] = permission
    manage_staff, _created = permission_model.objects.using(database).get_or_create(
        content_type=staff_content_type,
        codename="manage_staff_accounts",
        defaults={"name": "Can manage ordinary staff accounts"},
    )

    for group_name, codenames in ROLE_PERMISSIONS.items():
        group, _created = group_model.objects.using(database).get_or_create(name=group_name)
        permissions = [
            manage_staff if codename == "manage_staff_accounts" else event_permissions[codename]
            for codename in codenames
        ]
        group.permissions.set(permissions)


def restore_previous_editor_group(apps, schema_editor):
    group_model = apps.get_model("auth", "Group")
    permission_model = apps.get_model("auth", "Permission")
    database = schema_editor.connection.alias
    group_model.objects.using(database).filter(
        name__in=("Event viewers", "Event managers", "Staff managers")
    ).delete()
    editor = group_model.objects.using(database).filter(name="Event editors").first()
    if editor is not None:
        permissions = permission_model.objects.using(database).filter(
            content_type__app_label="events",
            content_type__model="event",
            codename__in=("view_event", "add_event", "change_event", "delete_event"),
        )
        editor.permissions.set(permissions)
    permission_model.objects.using(database).filter(
        content_type__app_label="staff_access",
        content_type__model="staffaccount",
        codename="manage_staff_accounts",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0004_event_publish_permission"),
        ("staff_access", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="staffaccount",
            options={
                "default_permissions": (),
                "permissions": (("manage_staff_accounts", "Can manage ordinary staff accounts"),),
                "proxy": True,
                "verbose_name": "Staff account",
                "verbose_name_plural": "Staff accounts",
            },
        ),
        migrations.RunPython(configure_staff_roles, restore_previous_editor_group),
    ]
