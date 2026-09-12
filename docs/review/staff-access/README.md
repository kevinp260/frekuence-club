# Staff access refinement review

These captures document the post-Phase-2 staff-access and contrast refinement. They use the
unmistakably synthetic, draft-only development fixture and a dedicated development account. No
real event is published, and no QR enrollment secret or password is captured.

- `staff-login-1440x1000.png`: password-only first sign-in step at desktop width.
- `staff-otp-1440x1000.png`: separate authenticator step shown only for an account with TOTP
  enabled.
- `staff-dashboard-1440x1000.png`: authenticated Django Admin dashboard with corrected module and
  content-sized Recent Actions panel.
- `staff-security-1440x1000.png`: account-security state with a high-contrast 2FA action.
- `staff-account-role-1024x900.png`: superuser account creation with the single bounded Access role
  selector and concise role descriptions.
- `staff-events-1440x1000.png`: the focused event list at desktop width.
- `staff-event-edit-1024x768.png`: practical-laptop event editor layout.

The capture tool checks each page for page-level horizontal overflow and runs Axe against WCAG
2/2.1/2.2 A/AA rules. It also verifies that the Recent Actions panel fits its module and that the
2FA action resolves to white text on the intended red background. The screenshots are supporting
evidence only; backend authentication, authorization, invitation, recovery, CSRF, and TOTP
behavior is covered by the Dockerized Django test suite.
