from typing import ClassVar

from django import forms

from .models import Event
from .validators import validate_lineup


class EventAdminForm(forms.ModelForm):
    lineup_text = forms.CharField(
        required=False,
        label="Lineup (one name per line)",
        help_text="Keep the performance order. Blank lines are ignored.",
        widget=forms.Textarea(attrs={"rows": 6}),
    )

    class Meta:
        model = Event
        fields = (
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
            "lineup_text",
            "poster",
            "poster_alt_sq",
            "poster_alt_en",
            "publication_status",
            "event_status",
            "is_featured",
            "entry_note_sq",
            "entry_note_en",
        )
        widgets: ClassVar = {
            "description_sq": forms.Textarea(attrs={"rows": 8}),
            "description_en": forms.Textarea(attrs={"rows": 8}),
            "starts_at": forms.SplitDateTimeWidget(
                date_attrs={"aria-label": "Start date"},
                time_attrs={"aria-label": "Start time"},
            ),
            "ends_at": forms.SplitDateTimeWidget(
                date_attrs={"aria-label": "End date"},
                time_attrs={"aria-label": "End time"},
            ),
            "doors_at": forms.SplitDateTimeWidget(
                date_attrs={"aria-label": "Doors date"},
                time_attrs={"aria-label": "Doors time"},
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "lineup_text" in self.fields:
            self.fields["lineup_text"].initial = "\n".join(self.instance.lineup or [])
        if "poster" in self.fields:
            self.fields["poster"].widget.attrs["accept"] = "image/jpeg,image/png,image/webp"
            self.fields["poster"].help_text = (
                "JPEG, PNG, or WebP only; maximum 15 MiB and 40 megapixels. "
                "Responsive WebP copies are generated automatically."
            )

    def clean_lineup_text(self):
        lineup = [
            line.strip() for line in self.cleaned_data["lineup_text"].splitlines() if line.strip()
        ]
        validate_lineup(lineup)
        return lineup

    def _get_validation_exclusions(self):
        exclusions = super()._get_validation_exclusions()
        if self.cleaned_data.get("is_featured"):
            # The request service locks and replaces the current featured row atomically. Excluding
            # this field here prevents ModelForm's pre-save constraint check from blocking that
            # deliberate replacement; model clean() and database constraints still enforce validity.
            exclusions.add("is_featured")
        return exclusions

    def _post_clean(self):
        self.instance.lineup = self.cleaned_data.get("lineup_text", [])
        super()._post_clean()

    def save(self, commit=True):
        event = super().save(commit=False)
        event.lineup = self.cleaned_data["lineup_text"]
        if commit:
            event.save()
            self.save_m2m()
        return event
