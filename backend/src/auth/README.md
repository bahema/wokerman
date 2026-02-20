# Auth (Email + Password)

This project uses a **single-owner auth model**:

- First successful signup creates the only boss account.
- Any further signup attempts are blocked.
- Owner email and role are immutable after first signup.
