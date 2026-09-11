from ipaddress import ip_address


def _validated_ip(value):
    if not isinstance(value, str):
        return None
    try:
        return str(ip_address(value))
    except ValueError:
        return None


def get_axes_client_ip_address(request):
    """Resolve the single client address set by the trusted gateway."""

    forwarded_address = _validated_ip(request.META.get("HTTP_X_FORWARDED_FOR"))
    if forwarded_address is not None:
        return forwarded_address
    return _validated_ip(request.META.get("REMOTE_ADDR"))
