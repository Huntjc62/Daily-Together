# Daily Together — Supabase edition

This edition keeps the approved Daily Together routine and synchronises photo check-ins across Josh's and Lily's devices using Supabase Auth, Postgres, Storage and Realtime.

## Important: passwords are NOT in the website code

The login form uses the email address and password of the account created in **Supabase Authentication**. There are no app-specific usernames or passwords in the website code. Supabase verifies the credentials, then the app reads the signed-in account's role from `public.profiles`. Never put a Supabase secret/service-role key or account password in this repository.

## 1. Create a Supabase project

1. Visit https://supabase.com/dashboard and create a project.
2. Choose a strong database password and keep it private.
3. Select a UK or nearby European region if available.
4. Wait for the project to finish provisioning.

## 2. Create the two Auth users

In your Supabase project:
1. Open **Authentication → Users**.
2. Select **Add user** / **Create new user**.
3. Create Josh's Supabase Auth user using the email address you want Josh to sign in with.
4. Create Lily's Supabase Auth user using the email address you want Lily to sign in with.
5. Set a password for each account and confirm the email if the dashboard offers that option.
6. Check that the user IDs match the IDs already entered in `supabase-setup.sql`. If they differ, update the IDs in that SQL before running it.

The app role is determined by the matching row in `public.profiles`, not by the email address. Josh's profile must have role `admin`; Lily's must have role `partner`.

## 3. Create the database, policies and private photo bucket

1. Open **SQL Editor** in Supabase.
2. Open `supabase-setup.sql` from this project.
3. The final profile insert is already filled in with Josh's and Lily's supplied UUIDs, with Josh assigned the admin role and Lily assigned the partner role.
4. Run the full SQL script.
6. Check that the `profiles` and `activity_completions` tables exist, and that the `daily-evidence` bucket is private.

The SQL sets Row Level Security policies so Lily can add her own photo-backed activity completions, Lily can see her own records, and Josh can view all progress and evidence. The browser only uses the publishable key; never put a Supabase secret/service_role key in website files.

## 4. Add your Supabase connection details

1. In the Supabase dashboard open **Project Settings → API** (the API keys area).
2. Copy the **Project URL**.
3. Copy the **publishable key** (often starts `sb_publishable_`). A legacy `anon` public key also works if your project shows that instead.
4. Open `supabase-config.js` and replace:
   - `https://YOUR_PROJECT_REF.supabase.co` with your Project URL
   - `sb_publishable_YOUR_KEY` with your publishable key
5. Save the file.

Only use the publishable/anon key in the browser. NEVER use a secret key or `service_role` key in `supabase-config.js`, GitHub or client-side JavaScript.

## 5. Publish to GitHub Pages

Upload these five files to the root of your existing repository, replacing the previous versions:
- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`
- `supabase-setup.sql` (keep this in the repository if desired; it contains no passwords or secret keys)

You can keep `README.md` too. Then visit **GitHub → repository Settings → Pages**, confirm Pages is publishing from your main branch and root folder, and wait for deployment.

## 6. Test both devices

1. Open the GitHub Pages URL on Lily's phone and sign in using Lily's Supabase Auth email address and password.
2. Complete one activity and upload its photo.
3. Open the same URL on Josh's computer and sign in using Josh's Supabase Auth email address and password.
4. Josh's dashboard should show the activity and a **View photo** link. New changes are subscribed live; if a device is offline, refresh when it reconnects.

## How the app works

- Routine text is stored in `app.js`; it is the same approved daily schedule.
- Every activity within a time block has a unique stable ID.
- Each activity requires its own photo before it is marked complete.
- Photos are compressed in the browser and uploaded to a private Supabase Storage bucket.
- Completion records are stored in Postgres with a UK-local completion date and timestamp.
- Josh's dashboard creates temporary signed links to view private photos.
- Progress is stored by date and does not reset by deleting browser data.
- A repeated activity cannot be completed twice for the same user and date.

## Notes

- This is a personal routine tracker, not a medical monitoring or treatment system.
- If an upload partially succeeds, already-saved activities remain complete. The remaining activities can be uploaded on a subsequent attempt.
- The old browser-only version's localStorage records are not automatically transferred into Supabase.
- Review your Supabase project's Auth settings, storage usage and database policies before using it with personal photos.
