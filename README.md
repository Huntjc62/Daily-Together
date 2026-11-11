# Daily Together — Admin and 7-day history upgrade

This upgrade keeps the existing Supabase login, photo uploads and design, and adds:
- Josh-only routine management (add, edit, delete and reorder time slots and activities).
- A last-seven-days history showing completed and missed activities, completion times and private photo links.
- Immutable daily routine snapshots, so editing or deleting a task does not rewrite the history already collected.
- A scheduled retention function that deletes completion rows, daily snapshots and their Storage photos once they are older than the seven-day window.

## Important

- The website signs in directly with Supabase Auth email and password.
- Josh's profile remains `admin`; Lily's remains `partner`.
- The browser uses only the existing publishable key in `supabase-config.js`.
- Never put a Supabase secret/service-role key or the cleanup secret in GitHub or browser JavaScript.
- The retention schedule is not active until you deploy the Edge Function and run `supabase-retention-setup.sql`.

## Part A — Update Supabase database

1. Open your existing Supabase project.
2. Open **SQL Editor**.
3. Open the updated `supabase-setup.sql` included in this ZIP.
4. Run the entire script. It is designed as an upgrade and uses `IF NOT EXISTS` / `ON CONFLICT` so it does not intentionally delete existing data.
5. Check that these tables now exist: `routine_sections`, `routine_tasks`, `daily_routine_snapshots`, `activity_completions`, and `profiles`.

This script adds the editable routine tables, seeds them with the current Daily Together schedule, adds access policies, and creates the daily snapshot function. Existing task IDs such as `s0-t0` are retained so today's existing completion records still match the original activities.

## Part B — Update GitHub Pages website

Replace these files in the root of your existing `Daily-Together` GitHub repository with the versions in this ZIP:

- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`

Keep your existing Supabase URL and publishable key. The included `supabase-config.js` already contains the connection details used by the current working version.

Commit the changes and wait for GitHub Pages to publish. Open the site in a private/incognito browser window or do a hard refresh if an old version is cached.

## Part C — Use the new Josh admin features

Sign in with Josh's Supabase Auth email and password. The admin dashboard now has three tabs:

1. **Today's overview** — today's progress, completion status and photo links.
2. **Manage routine** — add a new time slot, edit its time/title/description, add/edit/delete activities, delete a time slot, and move time slots or activities up and down.
3. **Last 7 days** — daily completion percentages, completed activities, missed activities, completion times and private photo links.

Lily still sees only her daily routine and photo upload controls. She cannot manage the routine or view the admin history.

When Lily opens the app, it records a snapshot of that day's routine. The snapshot stores the activity text and time as they were for that day. If you edit a task later, earlier history remains unchanged. New or changed tasks will appear in the next daily snapshot; if Lily reloads the app during the same day, uncompleted activities in that day's snapshot are refreshed.

## Part D — Enable automatic deletion after seven days

This part is separate because Supabase Storage photos must be removed through the Storage API. Deleting only database rows would leave the actual image files behind.

### 1. Deploy the Edge Function

1. In Supabase, open **Edge Functions**.
2. Create a function named `cleanup-daily-together`.
3. Use the source file included in this ZIP at `supabase/functions/cleanup-daily-together/index.ts`.
4. Deploy the function.
5. In the function settings, turn **Verify JWT** off. The function has its own shared-secret check and must be callable by the scheduled database job.
6. Open **Edge Function Secrets** and add a secret named `CLEANUP_SECRET`. Generate a long, random value (at least 32 characters) and keep it private. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; the function uses these server-side only.

If deploying with the Supabase CLI instead of the Dashboard, the included `supabase/config.toml` sets `verify_jwt = false` for this function. Deploy with `supabase functions deploy cleanup-daily-together`, then set the secret with `supabase secrets set CLEANUP_SECRET=YOUR_LONG_RANDOM_VALUE`.

### 2. Configure the daily schedule

1. Open `supabase-retention-setup.sql` from this ZIP in a text editor.
2. Replace `REPLACE_WITH_YOUR_LONG_RANDOM_CLEANUP_SECRET` with the exact same value you set for the Edge Function's `CLEANUP_SECRET`.
3. In Supabase, make sure the **pg_cron** and **pg_net** extensions are enabled. Vault is enabled by default on Supabase projects.
4. Run the edited `supabase-retention-setup.sql` in the Supabase SQL Editor.
5. Do not commit the edited SQL file containing your cleanup secret to a public GitHub repository. Keep the secret private.

The job runs daily at 03:15 UTC. It retains today and the previous six UK calendar days. Older photo files are deleted first through Supabase Storage; only after successful photo deletion are their completion rows removed. Old daily snapshots are then deleted. If photo deletion fails, the corresponding completion records are kept so the next run can retry.

### 3. Check the scheduled job

In Supabase, open **Integrations → Cron** (or **Database → Cron Jobs**) and check for `daily-together-seven-day-cleanup`. Use its run history to confirm it is succeeding. The first automatic run occurs at the next scheduled time. You can also invoke the Edge Function manually from the Dashboard to test it.

## Notes and behaviour

- The seven-day history is seven UK calendar dates: today plus the previous six days.
- A daily history snapshot is created when Lily opens the app that day. If she does not open the app on a particular day, no full list of expected activities exists for that date, so it cannot show missed tasks for that day.
- History is not retroactively complete for days before this upgrade. The SQL backfills what it can from recent existing completion records, but the full completed/missed comparison starts once the new version is in use.
- Deleting a task or section removes it from the current routine, but it does not erase its existing daily snapshots or completion photos. Those remain in history until the seven-day retention job clears them.
- If you edit an activity after Lily has already completed it that day, its completed snapshot remains as originally recorded.
- The routine manager and history are admin-only. Lily cannot change routine data.
- The cleanup function uses a server-side Supabase key and a separate random secret. Neither belongs in the website code.
