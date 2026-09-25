---
name: react-frontend
description: Conventions for the React feedback-form frontend. Use when creating or editing React components, form handling, validation, API calls to the Lambda endpoint, or frontend build config and tests.
---

# React frontend

The frontend is a React + TypeScript single-page app containing the feedback form. It POSTs JSON to the Lambda endpoint.

## Guidelines

- Use function components and hooks only. Keep the form as a controlled component or use a form library (e.g. React Hook Form) consistently, not both.
- Validate client-side for UX, but treat the Lambda as the source of truth. Field names and constraints must match the backend's validation and Parquet schema (see the `aws-backend` skill). Share types from a common module where possible.
- Isolate the network call in one API module (e.g. `src/api/feedback.ts`). Components must not call `fetch` directly.
- The app lives in `frontend/`. Settings come from `src/config.ts` (runtime `public/config.json` first, then build-time `VITE_*` fallback), never hardcoded. Read config via the `AppConfig` object passed from `main.tsx`, not `import.meta.env` directly. Do not commit environment-specific values.
- Handle all submission states explicitly: idle, submitting (disable the button to prevent double submit), success, and error (show a retryable message; don't lose the user's input on failure).
- Accessibility: every input has an associated `<label>`, errors are announced (`aria-live` / `aria-describedby`), and the form is keyboard-operable.
- Never put secrets in the frontend; the endpoint is public, so assume anyone can call it.

## Testing

- Use React Testing Library, querying by role/label rather than test IDs or implementation details.
- Mock the API module (or use MSW), not `fetch` internals.
- Cover: validation errors, successful submit, and server-error handling.

## Before finishing

From `frontend/`, run `npm run typecheck`, `npm test` and `npm run build`.
