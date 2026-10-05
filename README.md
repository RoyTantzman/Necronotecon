# Necronotecon

A single-user, capture-first notes app: a book of forbidden knowledge you dump things into and later dig back out of. Type fast, search later, no folders. See `SPEC.md`.

**Status:** stages 1–5 of the build order are done (capture, search, `#groc` lists, `#todo` with deadlines and Next up, pinning, `#read` link previews, export). Stored locally in IndexedDB; Supabase, PWA and deployment come in later stages.

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
