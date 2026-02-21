# Auth (Email + Password)

This project uses a **single-owner auth model**:

- Owner account is provisioned once (outside public runtime routes).
- Public signup/account-creation routes are disabled.
- Owner email and role are immutable after initial owner setup.
