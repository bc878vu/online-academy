# Online Academy Email Notifications

The notification system uses the existing Vercel API + Firebase Authentication + Resend.

## Vercel environment variables

Add these to the Vercel project for **Production** (and Preview if you test there):

- `RESEND_API_KEY` = your Resend API key
- `RESEND_FROM_EMAIL` = a verified sender, for example `Online Academy <no-reply@yourdomain.com>`
- `PUBLIC_APP_URL` = `https://online-academy-plum.vercel.app`

The existing Firebase server variables used by `api/_firebase.js` must remain configured:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_WEB_API_KEY`

## Resend sender

The `RESEND_FROM_EMAIL` address/domain must be allowed by Resend. Do not put the Resend API key in frontend/Vite variables.

## What is now supported

1. A newly published course automatically triggers an email to all Firebase Auth users.
2. The same course will not be sent twice because the course stores `launchEmailSentAt` after a successful send.
3. Admin can send a custom announcement/notes email from the floating bell button.
4. Audience options:
   - All users
   - Paid users (users with at least one paid order)
   - Free users (users without a paid order)
5. Custom subject, message/notes and optional link are supported.
6. Email delivery is done server-side so the Resend API key is never exposed to students.

## Important

The automatic watcher runs while the admin application is open. If a course is published while no admin browser session is active, opening the admin site afterward will detect the publish event only if it happens during that session; for fully server-side publish triggers, move the publish operation to a trusted server endpoint or Cloud Function later.
