# Necronotecon: Project Spec

**Necronotecon** is a single-user, capture-first notes web app. The name is a pun on the Necronomicon: a book of forbidden knowledge that you dump things into and later dig back out of.

## Naming and branding

- App name: **Necronotecon** (use this for the repo name `necronotecon`, the page title, the README heading, and the PWA `name`).
- PWA `short_name`: **Necro** (so it fits under the Android home screen icon).
- Tone: light, a little spooky and self-aware, never at the expense of clarity. Interface labels stay plain and functional (Notes, Next up, Search); the theme shows in the visual design and small touches only.
- Visual direction: dark theme by default, an aged-tome feel (muted parchment and ink tones, one eerie accent color such as sickly green or deep violet), a readable serif or mono for note text. A small tentacle, eye or tome glyph works as the app icon. Keep contrast high and text easy to read, since fast, comfortable capture matters more than the look.
- Optional, low-priority flavor (only after everything else works): playful empty-state text, such as "The pages are blank. Feed it." Never let flavor text get in the way of usability or tests.

A single-user, capture-first notes web app. Type fast, find things later, no folders. Primarily used on a PC, with the phone (Android, Chrome) used for quick capture and reading lists. Built to run on free hosting with no server to maintain.

## Principles

1. **Capture first.** Opening the app puts the cursor in an empty text box. No "new note" button, no title field.
2. **Search, not folders.** One flat list of notes, newest first, with a search box always visible.
3. **Explicit triggers, never guessing.** Behavior comes from short tags the user types (`#todo`, `#groc`). The app must never auto-categorize or guess intent.
4. **Text is the source of truth.** Every note is plain text. Lists, checkboxes and dates are rendered from that text, so everything stays editable and exportable.
5. **No friction.** Every added decision, popup or required field is a bug.

## Stack

- TypeScript, Vite, and React (or Svelte if the session prefers; keep it small).
- Installable PWA (manifest, service worker, offline-capable shell).
- Storage behind an interface with two adapters:
  - `LocalAdapter`: IndexedDB. Used for development and as the offline queue. The app must be fully usable with only this adapter, so the project works before any backend is set up.
  - `SupabaseAdapter`: Postgres, auth, full-text search. Used in production.
- Date parsing: `chrono-node` (or equivalent) for natural language dates.
- Hosting: static build deployed to GitHub Pages or Cloudflare Pages via GitHub Actions.
- Tests: Vitest for logic (parsing, tags, sorting), plus a small number of component tests.

## Data model

`notes`
- `id` (uuid), `body` (text), `created_at`, `updated_at`
- `pinned` (bool)
- `deleted_at` (nullable, soft delete)
- `search` (tsvector generated from `body`, GIN index)

Derived at read time from `body`, not stored separately:
- tags, checklist items and their checked state, due dates.

Checked state is stored in the text itself (`- [x]` / `- [ ]`), so the text remains the single source of truth.

## Features

### 1. Capture and list
- Home screen: text box on top, notes list below, newest first.
- Save with Ctrl+Enter on PC and a large Save button on phone. Auto-save drafts locally so nothing typed is lost.
- Edit a note by clicking it. Delete is a soft delete with an undo toast.

### 2. Search
- Always-visible search box, focusable with `/` or Ctrl+K.
- Full-text search that tolerates partial words and ignores case. Results update as you type.
- Matches highlighted in results. Searching `#groc` filters to that tag.

### 3. Tags with behavior
Tags are typed inline and apply to the whole note. Starter tags:

| Tag | Behavior |
|-----|----------|
| `#groc` | Items after the tag become a checkbox list. |
| `#todo` | Each item becomes a task, optionally with a deadline (see section 4). |
| `#read` | Links in the note are shown as clickable previews (title and domain only; no scraping of full content in v1). |

List item splitting rules (for `#groc` and `#todo`):
- If the note has multiple lines, each line is an item.
- Otherwise, if it has commas, split on commas, so `#groc eggs, milk, olive oil` gives three items.
- Otherwise, split on spaces.
- The original text is preserved. Rendering turns it into checkbox lines (`- [ ] eggs`) when the note is saved, and the user can edit them freely afterwards.

Typing `#groc` when an open (unfinished) `#groc` note already exists offers to append to it instead of creating a second one.

Any other `#word` is a free tag: it filters, but has no special behavior. Tag autocomplete suggests existing tags while typing.

### 4. Todos with deadlines and the "Next up" view

**Entering a deadline.** In a `#todo` note, a deadline is recognized from natural language after the words `by`, `due`, `before`, or `on`:
- `#todo call landlord by friday`
- `#todo renew passport due 20 nov`
- `#todo send invoice by tomorrow 5pm`
- Multiple tasks, each with its own deadline: one task per line, each line parsed independently.
- If no time is given, default to end of that day (23:59), not the morning.
- The recognized date appears as a small chip beside the task. Click it to change or remove it. If the date can't be parsed, show the text as-is with no chip. Never throw an error.

**The "Next up" view.** A dedicated view (top-level tab, the default tab on phone) listing every unchecked task across all notes:
1. **Overdue** first, highlighted, most overdue first.
2. Then tasks with deadlines, sorted by soonest deadline first, grouped under headings: Today, Tomorrow, This week, Later.
3. **No deadline** tasks last, in a collapsed section.
- Each row shows the task text, a relative deadline ("in 2 days", "3h overdue"), and a link to its source note.
- Checking a task here updates the original note's text. Checked tasks disappear from this view and are kept in the note.
- One-tap snooze on a task: tonight, tomorrow, next week (rewrites the date in the note).
- A small counter of overdue/today tasks appears in the tab title.

### 5. Pinning
- Pin a note to keep it at the top of the main list (e.g. the grocery list).

### 6. Phone experience (Android / Chrome)
- Installable PWA, opens straight to capture.
- Large touch targets, one-handed layout, fast load.
- Checklist items are easy to tick while shopping.
- Android share target: sharing a link or text from Chrome creates a new note (supported via the PWA manifest `share_target`).
- Works offline: notes created offline are queued in IndexedDB and synced when back online. Resolve conflicts with last-write-wins on `updated_at`; do not lose data silently (keep the losing version in a "conflicts" note if two edits collide).

### 7. Export
- Settings has "Export all notes" as a single Markdown or JSON file download.

### Out of scope (do not build)
Folders, nested tags, rich-text toolbar, note linking, AI categorization, collaboration, push notifications (the Today/Next-up views replace reminders).

## Auth and security
- Single user. Sign-in with email and password (or magic link) via Supabase Auth, with public sign-ups disabled.
- Row Level Security on every table so only the authenticated owner can read or write.
- Supabase URL and anon key come from environment variables. Never commit secrets. Provide `.env.example`.
- If no Supabase config is present, the app falls back to `LocalAdapter` and shows a small "local only" indicator.

## Build order
Build and verify each stage (tests passing, app runs) before starting the next.

1. Project scaffold, `LocalAdapter`, capture box, notes list, soft delete, drafts.
2. Full-text search (client-side first, then Postgres FTS in the Supabase adapter).
3. Tag parsing and the `#groc` checklist behavior; append-to-existing offer.
4. `#todo` with natural-language deadlines, chips, and the **Next up** view with ordering rules above. This needs thorough unit tests for date parsing and sort order, including time zones (the user is in Asia/Jerusalem; use the browser's local time zone, never UTC assumptions) and week boundaries (the week starts on Sunday there).
5. Pinning, `#read` link previews, export.
6. PWA install, phone layout polish, share target, offline queue and sync.
7. `SupabaseAdapter`, auth, RLS, and migration SQL in `/supabase/migrations`.
8. GitHub Actions workflow to build and deploy to GitHub Pages (or Cloudflare Pages).

## Manual steps the user must do (write these into `SETUP.md`)
The cloud session cannot create accounts or enter keys. Produce a clear, click-by-click `SETUP.md` covering:
1. Create a free Supabase project, run the migration SQL, disable public sign-ups, create the single user.
2. Add the Supabase URL and anon key as GitHub repository secrets.
3. Enable GitHub Pages (or connect Cloudflare Pages) so the deploy workflow publishes the site.
4. Install the app to the Android home screen.

## Definition of done
- All features above work with `LocalAdapter` alone, and tests pass.
- Typing `#todo pay rent by friday, book dentist by next tuesday` produces two tasks with correct deadlines, and they appear in **Next up** ordered by soonest deadline, with overdue items on top.
- The app is usable on a phone-sized viewport and installable.
- `README.md` explains how to run it locally; `SETUP.md` explains production setup.
