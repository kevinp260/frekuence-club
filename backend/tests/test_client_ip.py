from types import SimpleNamespace

from django.test import SimpleTestCase

from config.client_ip import get_axes_client_ip_address


class AxesClientIpResolverTests(SimpleTestCase):
    def resolve(self, *, forwarded=None, remote=None):
        meta = {}
        if forwarded is not None:
            meta["HTTP_X_FORWARDED_FOR"] = forwarded
        if remote is not None:
            meta["REMOTE_ADDR"] = remote
        return get_axes_client_ip_address(SimpleNamespace(META=meta))

    def test_accepts_one_valid_forwarded_ipv4_or_ipv6_address(self):
        self.assertEqual(
            self.resolve(forwarded="198.51.100.24", remote="172.20.0.4"),
            "198.51.100.24",
        )
        self.assertEqual(
            self.resolve(forwarded="2001:0db8::24", remote="172.20.0.4"),
            "2001:db8::24",
        )

    def test_rejects_forwarded_chains_and_malformed_values(self):
        for forwarded in (
            "198.51.100.24, 203.0.113.9",
            "not-an-address",
            "999.999.999.999",
            "198.51.100.24:443",
            " 198.51.100.24 ",
        ):
            with self.subTest(forwarded=forwarded):
                self.assertEqual(
                    self.resolve(forwarded=forwarded, remote="172.20.0.4"),
                    "172.20.0.4",
                )

    def test_uses_a_valid_socket_address_as_fallback_and_fails_closed(self):
        self.assertEqual(self.resolve(remote="2001:db8::5"), "2001:db8::5")
        self.assertIsNone(self.resolve(remote="invalid-socket-address"))
