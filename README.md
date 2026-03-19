# NEU Lab Log

A web app for tracking professor room usage at New Era University. Professors scan a QR code to check in to a room, and admins monitor everything from a dashboard.

**Live site:** https://database-1011.web.app

---

## What It Does

### For Professors
- Sign in with your `@neu.edu.ph` Google account
- Tap **Scan** and point your camera at the QR code posted in a room to check in
- Tap **Sessions** to see your active session with a live timer
- Tap **Check Out from Room** when you're done

### For Admins
- See all room usage logs with check-in and check-out times
- See which rooms are currently occupied — and force a checkout if needed
- Void or restore individual log entries (with an optional reason)
- Export logs as a CSV file
- Manage which professors can access the system (whitelist, block/unblock)
- Promote a professor to admin, or revoke admin access
- Generate and print QR codes for each room — saved so they're always there when you come back
- Switch to professor mode to scan rooms yourself, then switch back
- View a full audit trail of every action taken in the system

---

## Key Rules

- **One room, one professor at a time.** The system blocks a second check-in to an occupied room — this is enforced on the server, so it cannot be bypassed.
- **Only whitelisted `@neu.edu.ph` emails can sign in.** Admins control the whitelist.
- **All admin actions are logged.** Nothing is silently changed.

---

## Tech Stack

| | |
|---|---|
| Frontend | HTML, JavaScript, Tailwind CSS |
| Fonts | Google Fonts (Outfit, Nunito Sans) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore |
| Hosting | Firebase Hosting |
| PWA | Service Worker (offline shell + installable) |
| QR Scanning | html5-qrcode |
| QR Generation | qrcodejs |

---

## Installing the App (Professors)

The professor panel works as a PWA — it can be installed on your phone like a regular app.

**Android:** Open the site in Chrome → tap the three-dot menu → **Add to Home Screen**

**iPhone:** Open the site in Safari → tap the Share button → **Add to Home Screen**

---

## License

**Academic Integrity & Copyright Notice**

This project was developed for academic purposes at NEU. It is intended solely for educational use, evaluation, and portfolio demonstration.

This is not an open-source project. Unauthorized copying, adaptation, distribution, or commercial use of this codebase is strictly prohibited.