# Necronotecon

A single-user, capture-first notes app: a book of forbidden knowledge you dump things into and later dig back out of. Type fast, search later, no folders. See `SPEC.md`.

**Status:** all eight build stages are done: capture, search, `#groc` lists, `#todo` deadlines and Next up, pinning, `#read` previews, export, installable offline PWA with Android share target, Supabase sync and login, and a GitHub Pages deploy workflow. Works fully offline with IndexedDB alone; add Supabase for sync (see `SETUP.md`).

## Run locally

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (runs in the Asia/Jerusalem time zone)
npm run build      # typecheck + production build into dist/
```

## Using it

- Type in the box at the top, **Ctrl+Enter** (or Save) to store. Drafts are kept automatically.
- Click a note to edit it. Delete shows an undo toast.
- Search with `/` or **Ctrl+K**; `#groc` filters by tag.
- `#groc eggs, milk` becomes a checklist. `#todo pay rent by friday, book dentist by next tuesday` becomes two tasks with date chips, listed in **Next up**.

- Pin a note with its Pin button. `#read` notes show their links as title + domain cards. Settings exports Markdown or JSON.
- On a wide monitor Next up sits in a column beside the notes.

Design choices for ambiguous spots in the spec are in `DECISIONS.md`.
