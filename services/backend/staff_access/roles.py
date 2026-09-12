from dataclasses import dataclass

from django.core.exceptions import PermissionDenied


@dataclass(frozen=True)
class StaffRole:
    code: str
    label: str
    group_name: str


EVENT_VIEWER = StaffRole("event_viewer", "Event viewer", "Event viewers")
EVENT_EDITOR = StaffRole("event_editor", "Event editor", "Event editors")
EVENT_MANAGER = StaffRole("event_manager", "Event manager", "Event managers")
STAFF_MANAGER = StaffRole("staff_manager", "Staff manager", "Staff managers")
SUPERUSER_ROLE = "superuser"
MANAGE_STAFF_PERMISSION = "staff_access.manage_staff_accounts"

STAFF_ROLES = (EVENT_VIEWER, EVENT_EDITOR, EVENT_MANAGER, STAFF_MANAGER)
ROLE_BY_CODE = {role.code: role for role in STAFF_ROLES}
MANAGED_GROUP_NAMES = tuple(role.group_name for role in STAFF_ROLES)


def can_manage_staff_accounts(user):
    return bool(
        user.is_authenticated
        and user.is_active
        and user.is_staff
        and (user.is_superuser or user.has_perm(MANAGE_STAFF_PERMISSION))
    )


def can_manage_staff_target(actor, target=None):
    if not can_manage_staff_accounts(actor):
        return False
    if target is None:
        return True
    if actor.is_superuser:
        return target.is_staff
    return bool(
        target.is_staff
        and not target.is_superuser
        and target.pk != actor.pk
        and role_code_for_user(target) != STAFF_MANAGER.code
    )


def role_code_for_user(user):
    if user.is_superuser:
        return SUPERUSER_ROLE
    group_names = {group.name for group in user.groups.all()}
    for role in reversed(STAFF_ROLES):
        if role.group_name in group_names:
            return role.code
    return ""


def role_label_for_user(user):
    code = role_code_for_user(user)
    if code == SUPERUSER_ROLE:
        return "Superuser"
    role = ROLE_BY_CODE.get(code)
    return role.label if role else "No role assigned"


def role_choices_for_actor(actor, target=None):
    if target is not None and target.is_superuser:
        return ((SUPERUSER_ROLE, "Superuser"),) if actor.is_superuser else ()
    roles = STAFF_ROLES if actor.is_superuser else STAFF_ROLES[:-1]
    choices = tuple((role.code, role.label) for role in roles)
    if actor.is_superuser:
        choices += ((SUPERUSER_ROLE, "Superuser"),)
    return choices


def assign_staff_role(*, user, role_code, actor):
    allowed_codes = {code for code, _label in role_choices_for_actor(actor, user)}
    if role_code not in allowed_codes:
        raise PermissionDenied("You cannot assign this staff role.")
    if role_code == SUPERUSER_ROLE:
        if not user.is_superuser:
            user.is_superuser = True
            user.save(update_fields=("is_superuser",))
        user.groups.remove(*user.groups.filter(name__in=MANAGED_GROUP_NAMES))
        return
    role = ROLE_BY_CODE[role_code]
    user.groups.remove(*user.groups.filter(name__in=MANAGED_GROUP_NAMES))
    user.groups.add(user.groups.model.objects.get(name=role.group_name))
