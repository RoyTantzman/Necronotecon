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
14. **Not yet done (later stages):** pinning, `#read` previews, export, PWA/manifest/icons/share target/offline queue, SupabaseAdapter, auth, migrations, deploy workflow, `SETUP.md`, `.env.example`. The `pinned` field already exists in the data model.
