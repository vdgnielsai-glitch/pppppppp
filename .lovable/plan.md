## Goal
Bring `/auto` (Cars page) fully in line with the reference. The list rows, "+ Nieuw" button, modal fields and 8-color picker with car icons are already implemented. Two things still need work: enforcing the **1 voertuig zonder Premium** limit, and making the modal "Annuleren" button visually dark per the design.

## Changes — `src/pages/Cars.tsx`

### 1. Enforce free-tier limit (max 1 car without Premium)
- Compute `canAddMore = premium || cars.length < 1`.
- In `openNew()`: if `!canAddMore`, navigate to `/premium` instead of opening the modal and show a toast ("Upgrade naar Premium voor meerdere voertuigen").
- In `save()` (create branch): re-check the limit server-side-style as a guard; abort with the same toast if exceeded.
- Disable / lock-style the "+ Nieuw" header button when `!canAddMore`: render it with a 🔒 lock icon and muted styling, still clickable but routes to `/premium`.

### 2. Lock indicator on extra rows (visual only)
The first car stays normal. For free users, if somehow more than one car exists (legacy data), render rows beyond index 0 with:
- Reduced opacity (`opacity-60`).
- A small `Lock` badge overlapping the colored car tile.
- Clicking the row routes to `/premium` instead of opening edit.

(For new free users this branch is a safety net; the primary gate is the add flow.)

### 3. Keep existing premium upsell card
Keep the existing "🔒 Premium: voeg meerdere voertuigen toe" link card — it already matches the reference's lock affordance and links to `/premium`. No change.

### 4. Modal buttons — match reference
- "Annuleren": switch from `variant="outline"` to a dark style: `className="bg-foreground text-background hover:bg-foreground/90"` (donker vlak met lichte tekst).
- "Opslaan": already `bg-primary` (groen mint) — keep.
- Keep both buttons full-width-ish inside `DialogFooter` so they read as the two primary actions in the bottom sheet.

### 5. No other layout changes
- Rows already show colored circular car icon + name + "STANDAARD" badge + plate.
- "+ Nieuw" button stays top-right (inside `PageHeader` action slot).
- Color picker already has 8 tiles with `CarIcon` inside.

## Out of scope
- Converting the Dialog into a true bottom sheet (`Sheet` component). The current centered Dialog with rounded corners reads as a sheet on mobile and matches the reference closely enough; switching components would touch unrelated styling. Can be a follow-up if you want a true slide-up sheet.
- Database-level enforcement of the 1-car limit (would need an RLS/trigger migration). Client gate + Premium check on the server-side subscription is sufficient for the UX.
