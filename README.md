# Daily Together — static GitHub Pages version

This version has two logins built into `app.js` and does not use Firebase or any other backend.

## Logins

- Josh / JoshH — admin dashboard
- Lily / LilyH — daily routine and photo check-ins

The credentials are in the `USERS` object near the top of `app.js`.

## Important limitation: local-only data

GitHub Pages is static hosting. This version saves progress and uploaded photos in the browser's `localStorage`. This means:

- Data remains on the same browser and device.
- Josh can log in on the same browser/device and see Lily's check-ins.
- A different phone, computer or browser will have a separate copy. It will not automatically sync between Josh and Lily's devices.
- Clearing browser data can delete the saved check-ins and photos.

The credentials are visible to anyone who inspects the website's source code. This is a convenience login, not secure authentication. Do not use it for sensitive information or reuse these passwords elsewhere.

## Publish on GitHub Pages

1. Download and extract this ZIP.
2. Create a GitHub repository.
3. Upload `index.html`, `styles.css`, `app.js` and `README.md` to the repository root.
4. In GitHub, open **Settings → Pages**.
5. Select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
6. Open the published GitHub Pages URL.

No Firebase configuration, database setup or build process is required.

## Routine

The routine follows the updated times and activities from 7:00 am to 9:30 pm. Each activity within a time block has its own photo upload. The block is complete only when every activity in it has a photo. Photos are resized in the browser before being saved locally. Daily check-ins are separated by date.

The routine is a general lifestyle organiser, not medical advice or a thyroid treatment plan. Keep it flexible and follow advice from the appropriate healthcare professional.
