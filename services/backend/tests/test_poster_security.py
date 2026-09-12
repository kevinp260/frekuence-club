import io
import os
import tempfile

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image

from events.images import inspect_poster
from events.models import Event
from events.validators import validate_poster_extension

from .helpers import event_fields, image_upload


class PosterValidationTests(SimpleTestCase):
    def test_jpeg_png_and_webp_are_decoded_and_accepted(self):
        cases = (
            ("poster.jpg", "JPEG", "image/jpeg"),
            ("poster.png", "PNG", "image/png"),
            ("poster.webp", "WEBP", "image/webp"),
        )
        for name, image_format, content_type in cases:
            with self.subTest(image_format=image_format):
                inspected = inspect_poster(
                    image_upload(name=name, image_format=image_format, content_type=content_type)
                )
                self.assertEqual(inspected.format, image_format)

    def test_svg_is_rejected_even_with_an_allowed_extension(self):
        upload = SimpleUploadedFile(
            "poster.png",
            b'<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            content_type="image/png",
        )
        with self.assertRaises(ValidationError):
            validate_poster_extension(upload)

    def test_spoofed_extension_is_rejected(self):
        upload = image_upload(name="poster.jpg", image_format="PNG", content_type="image/png")
        with self.assertRaisesMessage(ValidationError, "extension does not match"):
            inspect_poster(upload)

    def test_spoofed_mime_type_is_rejected(self):
        upload = image_upload(name="poster.png", image_format="PNG", content_type="image/jpeg")
        with self.assertRaisesMessage(ValidationError, "content type does not match"):
            inspect_poster(upload)

    def test_malformed_and_truncated_images_are_rejected(self):
        for payload in (b"not an image", image_upload().read()[:20]):
            with self.subTest(payload=payload[:10]):
                upload = SimpleUploadedFile("poster.png", payload, content_type="image/png")
                with self.assertRaisesMessage(ValidationError, "malformed"):
                    inspect_poster(upload)

    @override_settings(EVENT_POSTER_MAX_BYTES=32)
    def test_excessive_encoded_bytes_are_rejected_before_decode(self):
        upload = SimpleUploadedFile("poster.png", b"x" * 33, content_type="image/png")
        with self.assertRaisesMessage(ValidationError, "25 MiB"):
            inspect_poster(upload)

    @override_settings(EVENT_POSTER_MAX_PIXELS=100)
    def test_excessive_decoded_pixels_are_rejected(self):
        with self.assertRaisesMessage(ValidationError, "40 megapixel"):
            inspect_poster(image_upload(size=(11, 10)))

    def test_non_portrait_or_wrong_aspect_ratio_is_rejected(self):
        for size in ((160, 160), (1080, 1920), (2000, 1600)):
            with self.subTest(size=size):
                with self.assertRaisesMessage(ValidationError, "4:5 portrait"):
                    inspect_poster(image_upload(size=size))

    def test_small_export_rounding_difference_is_accepted(self):
        inspected = inspect_poster(image_upload(size=(1620, 2026)))
        self.assertEqual((inspected.width, inspected.height), (1620, 2026))


class PosterProcessingTests(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()

    def tearDown(self):
        self.settings_override.disable()
        self.media.cleanup()

    def test_randomized_paths_ignore_traversal_filename_and_derivatives_strip_metadata(self):
        exif = Image.Exif()
        exif[274] = 6
        exif[315] = "Sensitive test metadata"
        upload = image_upload(
            name="../../attacker-name.jpg",
            image_format="JPEG",
            content_type="image/jpeg",
            size=(100, 80),
            exif=exif,
        )
        event = Event(**event_fields(slug="secure-poster", poster=upload))
        event.save()

        self.assertNotIn("attacker-name", event.poster.name)
        self.assertNotIn("..", event.poster.name)
        self.assertTrue(event.poster.name.startswith("events/originals/"))
        self.assertEqual(event.poster_metadata["original"]["width"], 80)
        self.assertEqual(event.poster_metadata["original"]["height"], 100)

        with event.poster.open("rb") as stored:
            with Image.open(io.BytesIO(stored.read())) as normalized_original:
                self.assertEqual(normalized_original.size, (80, 100))
                self.assertFalse(normalized_original.getexif())
                self.assertNotIn("exif", normalized_original.info)

        with event.poster_480.open("rb") as stored:
            with Image.open(io.BytesIO(stored.read())) as derivative:
                self.assertEqual(derivative.format, "WEBP")
                self.assertEqual(derivative.size, (80, 100))
                self.assertFalse(derivative.getexif())
                self.assertNotIn("exif", derivative.info)

    def test_replacing_and_deleting_a_poster_removes_superseded_media(self):
        event = Event(**event_fields(slug="replace-poster"))
        event.save()
        old_names = event.media_names()
        event.poster = image_upload(name="replacement.png", size=(200, 250))
        with self.captureOnCommitCallbacks(execute=True):
            event.save()
        new_names = event.media_names()

        self.assertTrue(all(not event.poster.storage.exists(name) for name in old_names))
        self.assertTrue(all(event.poster.storage.exists(name) for name in new_names))
        with self.captureOnCommitCallbacks(execute=True):
            event.delete()
        self.assertTrue(all(not event.poster.storage.exists(name) for name in new_names))

    def test_no_user_filename_controls_any_stored_path(self):
        first = Event(**event_fields(slug="random-one", poster=image_upload(name="same.png")))
        second = Event(**event_fields(slug="random-two", poster=image_upload(name="same.png")))
        first.save()
        second.save()
        self.assertNotEqual(first.poster.name, second.poster.name)
        self.assertEqual(os.path.basename(first.poster.name).count("."), 1)
