# Frontend Security Notes

## JWT token storage (localStorage)

This application stores JWT access and refresh tokens in `localStorage` under keys
`inventory_access_token` and `inventory_refresh_token`.

**Trade-off:** Any script running in the page origin (for example via an XSS bug) can read
these tokens and impersonate the admin. `localStorage` is the common SPA pattern when the
backend issues bearer tokens and does not set httpOnly cookies.

**Mitigations in this codebase:**

- React renders all user-supplied text through JSX (no `dangerouslySetInnerHTML`).
- Form inputs are sanitized before submit (`frontend/src/utils/sanitize.js`) to strip HTML tags.
- Token refresh uses a single shared in-flight promise so concurrent 401s do not trigger
  multiple refresh requests (`frontend/src/api/client.js`).
- Expired or invalid refresh tokens clear storage and redirect to login via `SessionGuard`.

**Recommended production hardening (follow-up / deployment):**

1. **Preferred:** Move tokens to httpOnly, Secure, SameSite cookies (requires backend changes).
2. **Defense in depth:** Serve the app with a strict Content Security Policy, for example:
   `default-src 'self'; script-src 'self'; connect-src 'self' https://api.example.com;`
3. Keep dependencies updated and avoid introducing unsanitized HTML rendering.

## Data access and client-side filtering

The UI filters products and transactions in the browser after fetching list endpoints. This is
a **performance** limitation for large datasets, not an authorization bypass in this system:

- The backend requires `IsAdminUser` on `/api/products/`, `/api/categories/`, and
  `/api/transactions/` (see `inventory/views.py`).
- The product is a **single-admin** inventory system; authenticated admins are intended to
  see the full catalog. There are no per-user row-level permissions to enforce client-side.

If multi-tenant or role-based data scoping is added later, filtering must move server-side.

## Logout behavior

Logout clears both tokens from `localStorage`, resets `AuthContext` state, and navigates to
`/login`. There is no server-side token blacklist endpoint in the current Django API.

## Known performance limitations

- Dashboard aggregates and list filters are computed client-side. See `TASK_CONTEXT.md` for
  follow-up tasks (`/api/dashboard/`, server-side query filters).
