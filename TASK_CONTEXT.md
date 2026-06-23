# Task #7: Implement Dark Mode Theme

## Scope

Add a user-toggleable dark mode to the React/Vite frontend of the inventory management application. Users switch between Light and Dark mode; preference persists in `localStorage`. Default theme remains Light. Frontend-only — no backend changes.

## Key Implementation Decisions

- **Theme mechanism:** CSS custom properties on `:root` / `[data-theme='light']` with a `[data-theme='dark']` override block. Hardcoded colors in `index.css` were replaced with semantic variables so components inherit theme changes without per-page edits.
- **State management:** `ThemeContext` (React Context) mirrors the existing `AuthContext` / `NotificationContext` pattern. Theme is applied via `data-theme` on `document.documentElement`.
- **Persistence:** `localStorage.setItem('theme', theme)` on change; read on init with fallback to `'light'`. Invalid stored values are treated as light.
- **FOUC prevention:** Inline script in `index.html` sets `data-theme` before React hydrates.
- **Toggle placement:** `ThemeToggle` in the authenticated layout topbar and on the login page (outside `Layout`).
- **Accessibility:** Toggle uses `aria-label="Toggle dark mode"`, `aria-pressed`, visible focus rings, and sun/moon icons with text labels.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/context/ThemeContext.jsx` | Theme state, localStorage read/write, `data-theme` application |
| `frontend/src/components/ThemeToggle.jsx` | Accessible sun/moon toggle button |
| `frontend/src/components/Layout.jsx` | Add toggle to top navigation bar |
| `frontend/src/pages/Login.jsx` | Add toggle on login page |
| `frontend/src/main.jsx` | Wrap app with `ThemeProvider` |
| `frontend/index.html` | Early theme script to avoid flash of wrong theme |
| `frontend/src/index.css` | Dark palette variables; replace hardcoded colors with theme tokens |
| `frontend/src/test/ThemeContext.test.jsx` | Tests for default, persistence, toggle, and invalid storage |
| `frontend/src/test/Login.test.jsx` | Wrap Login tests with `ThemeProvider` |

## Assumptions

- `localStorage` key is `'theme'` with values `'light'` | `'dark'` (per task spec).
- Login page should expose the toggle even though it is outside the main shell.
- Existing sidebar dark styling is retained; dark mode mainly affects main content, forms, tables, modals, and notifications.

## Testing Performed

```bash
cd frontend && npm test
cd frontend && npm run build
```

Manual: toggle in topbar and login page; reload page to confirm persistence; verify forms, tables, badges, alerts, modals, and notifications in both themes.

## Open Questions / Follow-ups (out of scope)

- Respect `prefers-color-scheme` as initial default before user choice.
- System theme sync (auto light/dark based on OS).
- Theme toggle in sidebar on mobile layouts.
