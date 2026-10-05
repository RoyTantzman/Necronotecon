# Decisions

Places where SPEC.md was ambiguous or self-conflicting, and what was chosen.

1. **Default tab on phone vs. "opens straight to capture".** The capture box and search box are always shown at the top, above the tabs. On narrow screens (≤700px) the Notes/Next up tabs default to Next up; on PC to Notes.
2. **`#todo` single line without commas.** The splitting rule says "otherwise split on spaces", but `#todo call landlord by friday` must be one task. Space-splitting applies to `#groc` only; a single-line `#todo` without commas is one task.
3. **Which tag drives formatting.** If a note has both `#groc` and `#todo`, whichever appears first formats the list. Text before the tag line is kept; the tag line becomes just the tag (plus any preceding text), followed by the items. "Multi-line" means there are non-empty lines after the tag line.
4. **Relative dates are frozen on save.** "by friday" re-parsed later would roll forward forever and never go overdue. On save, a recognised deadline phrase in a `#todo` task line is rewritten to an absolute form (`by 2026-10-09`, or `by 2026-10-06 17:00` with a time; 23:59 is written as date only). The keyword the user typed (by/due/before/on) is kept. Unparseable text is left untouched with no chip.
5. **Date order.** Dates like `3/4` are parsed day-first (`chrono.en.GB`), since the user is in Israel. "next tuesday" is whatever chrono returns (Tuesday of next week).
6. **Deadlines need a keyword at the phrase start.** The first `by|due|before|on` whose following text parses as a date beginning right after it is used. "turn on lights" has no deadline.
7. **Which checkboxes are tasks.** Every `- [ ]`/`- [x]` line in a note that has the `#todo` tag. Checkbox lines in other notes are just checklists.
8. **Next up buckets.** Overdue = deadline before now (so a task due 12:00 is "Today" until 12:00). Today/Tomorrow are local calendar days; This week = through Saturday 23:59 (week starts Sunday), Later = after. A Saturday's "This week" therefore only holds that same day... and Sunday is Tomorrow. Everything is computed from local time-zone fields, never UTC.
9. **Snooze.** Tonight = today 20:00 (or 23:59 if it is already past 20:00); Tomorrow = tomorrow 23:59; Next week = today + 7 days at 23:59.
10. **Search.** Client-side substring match on every whitespace-separated token (AND). A `#tag` token matches notes with a tag *starting with* it, so results update while typing (`#gro` also finds `#groc`). Postgres FTS belongs to the Supabase adapter (stage 7).
11. **Append offer.** An "open" `#groc` note is one with at least one unchecked item. The offer applies only to new notes in the capture box, not edits.
12. **Sort order.** Notes are newest first by creation time (editing does not move a note). Pinning is stage 5.
13. **Tab-title counter** counts overdue + due today unchecked tasks, e.g. `(3) Necronotecon`.
14. **Wide screens (≥1000px).** Next up is a sticky side column next to the notes instead of a tab; from 1700px the notes list flows into two columns. Narrow screens keep the tabs. Requested on top of the spec.
15. **Text boxes grow** with their content (capture and edit), with a larger minimum size on desktop, and scroll past 60% of the viewport height.
16. **Pinning.** Pinned notes sort first (then newest first) and show a Pinned label; Pin/Unpin is on each note.
17. **`#read` previews.** No network access, so the "title" is the text written next to the link, else the last URL path segment (`how-to-brew-tea.html` becomes "how to brew tea"), else the domain; the domain is shown under it. A line with a link and other text shows one card titled with that text. In checkbox lines the link is shown inline, labelled by its domain. Only `#read` notes get previews.
18. **Export.** Settings (top right) downloads Markdown or JSON of all non-deleted notes, newest first. Soft-deleted notes are not exported.
19. **Remaining stages built after the first handover** (6-8). Items 20-29 cover them.
20. **Local-first sync.** The UI only talks to IndexedDB. With Supabase configured, a `SyncedAdapter` queues each edit (store `pending`, remembering the server `updated_at` it was based on) and mirrors with the server on start, when the browser comes back online, every 60 s, and 1.5 s after each edit. The badge shows synced / syncing / offline · N waiting / sync error.
21. **Conflicts.** A collision means the note changed locally while queued *and* the server copy changed since the base. Last write wins by `updated_at` (ties go to the local edit); the losing text is saved as a new note tagged `#conflicts`, with every line quoted (`> `) so it cannot create tasks or lists. There is one conflict note per collision, not a single shared "conflicts" note. Clocks are the devices' own, so a badly wrong clock can pick the wrong winner; the loser is still kept.
22. **Deletes** are soft deletes and sync like edits. A local delete against a newer server edit loses to the edit.
23. **Search stays client-side.** Every device keeps a full local copy, so search is instant and works offline. `SupabaseAdapter.search()` (Postgres full-text with prefix matching on the generated `search` column) exists and is tested, but the UI does not call it.
24. **Auth.** Email + password only (no magic link, no sign-up screen). The login screen appears only when the Supabase env vars are present at build time. Each user id gets its own IndexedDB database. Signing out leaves that local cache on the device.
25. **RLS.** `user_id` defaults to `auth.uid()`; policies allow select/insert/update/delete only where `user_id = auth.uid()`, only for the `authenticated` role. The anon role gets nothing.
26. **PWA.** `sw.js` caches the shell at install and caches other same-origin GETs as they are used (cache-first). Lazily loaded chunks (login and Supabase code) are cached after the first full load, so the very first offline launch right after installing can be missing them if the app was never opened online twice. Supabase requests are never cached.
27. **Share target** uses GET with `title`, `text`, `url`. The note body is title, text, and the URL if not already in the text; it is saved immediately (no edit step), then the query string is removed. Chrome Android puts the link in `text`.
28. **Phone layout.** At 700 px and below the tab bar is fixed to the bottom for thumb reach and the Save button is full width. Icons are generated PNGs of an eye-and-tentacles glyph (`public/icon-*.png`, plus a maskable one).
29. **Deploy.** GitHub Pages via Actions on pushes to `main` (tests run first). The Pages source setting and secrets are manual and listed in `SETUP.md`.

