from django import forms
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth import authenticate
from django.contrib.auth.forms import SetPasswordForm

from .models import StaffAccount
from .roles import EVENT_EDITOR, STAFF_ROLES, role_code_for_user

ROLE_CHOICES = tuple((role.code, role.label) for role in STAFF_ROLES)


class StaffRoleField(forms.ChoiceField):
    def __init__(self, **kwargs):
        super().__init__(
            choices=ROLE_CHOICES,
            label="Access role",
            help_text=(
                "Viewer: read events. Editor: create and edit drafts. Manager: publish and delete "
                "events. Staff manager: manage events and ordinary staff. Only a superuser can "
                "assign Staff manager or Superuser access."
            ),
            **kwargs,
        )


class StaffPasswordLoginForm(AdminAuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={"autofocus": True, "autocomplete": "username"})
    )
    password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )


class OTPVerificationForm(forms.Form):
    otp_token = forms.CharField(
        label="Authenticator code",
        min_length=6,
        max_length=8,
        widget=forms.TextInput(
            attrs={
                "autocomplete": "one-time-code",
                "autofocus": True,
                "inputmode": "numeric",
                "pattern": "[0-9]*",
            }
        ),
    )


class StaffSetupPasswordForm(SetPasswordForm):
    enable_totp = forms.BooleanField(
        required=False,
        initial=True,
        label="Set up an authenticator now (recommended)",
    )


class StaffAccountCreationForm(forms.ModelForm):
    role = StaffRoleField(initial=EVENT_EDITOR.code)

    class Meta:
        model = StaffAccount
        fields = ("username", "first_name", "last_name", "email")

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_active = True
        user.is_staff = True
        user.is_superuser = False
        user.set_unusable_password()
        if commit:
            user.save()
        return user


class StaffAccountChangeForm(forms.ModelForm):
    role = StaffRoleField()

    class Meta:
        model = StaffAccount
        fields = ("username", "first_name", "last_name", "email", "is_active")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.initial["role"] = role_code_for_user(self.instance)


class DisableTOTPForm(forms.Form):
    password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )
    otp_token = forms.CharField(
        label="Current authenticator code",
        min_length=6,
        max_length=8,
        widget=forms.TextInput(
            attrs={"autocomplete": "one-time-code", "inputmode": "numeric", "pattern": "[0-9]*"}
        ),
    )

    def __init__(self, *args, request, **kwargs):
        self.request = request
        super().__init__(*args, **kwargs)

    def clean_password(self):
        password = self.cleaned_data["password"]
        user = authenticate(
            self.request,
            username=self.request.user.get_username(),
            password=password,
        )
        if user is None or user.pk != self.request.user.pk:
            raise forms.ValidationError("The password was not accepted.")
        return password


class AdminResetAccessForm(forms.Form):
    password = forms.CharField(
        label="Your password",
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )
    otp_token = forms.CharField(
        label="Your authenticator code",
        required=False,
        min_length=6,
        max_length=8,
        widget=forms.TextInput(
            attrs={"autocomplete": "one-time-code", "inputmode": "numeric", "pattern": "[0-9]*"}
        ),
    )

    def __init__(self, *args, request, **kwargs):
        self.request = request
        super().__init__(*args, **kwargs)

    def clean_password(self):
        password = self.cleaned_data["password"]
        user = authenticate(
            self.request,
            username=self.request.user.get_username(),
            password=password,
        )
        if user is None or user.pk != self.request.user.pk:
            raise forms.ValidationError("The password was not accepted.")
        return password
