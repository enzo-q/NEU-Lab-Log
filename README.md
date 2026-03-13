# NEU Lab Log

A Progressive Web App (PWA) for logging professor room usage at NEU — built with Firebase, Firestore, and QR code scanning.

Professors scan a QR code to check in to a room. Admins monitor all activity from a desktop dashboard.

Live deployed link (using Firebase Hosting):
https://database-1011.web.app/

---

## Features

- **QR Check-in / Check-out** — professors scan a room QR code to log their session
- **Live Session Timer** — active session card shows real-time duration
- **One Room, One Professor** — a room can only be occupied by one professor at a time (not yet fixed)
- **Admin Dashboard** — view all logs, void/restore entries, export CSV
- **Audit Log** — every admin action is recorded with timestamps
- **Professor Management** — whitelist emails, block/unblock access
- **PWA Support** — professors can install the app on their phone like a native app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, Tailwind CSS (CDN) |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Cloud Firestore |
| QR Scanning | html5-qrcode v2.3.8 |
| Hosting | Firebase Hosting |

---

## Project Structure

```
neu-lab-log/
│
├── index.html                   ← Login page
├── scanner.html                 ← Professor QR scanner (PWA)
├── professor-dashboard.html     ← Professor session view & check-out (PWA)
├── dashboard.html               ← Admin dashboard
├── qr-generator.html            ← Admin QR code generator
│
├── manifest.json                ← PWA manifest
├── sw.js                        ← Service worker (offline shell)
├── firebase.json                ← Firebase Hosting + Firestore rules config
├── neu.png                      ← Official NEU logo
├── deploy.sh                    ← One-command deploy script
│
├── css/
│   ├── dashboard.css
│   ├── scanner.css
│   └── professor-dashboard.css
│
├── js/
│   ├── firebase-config.js       ← Firebase initialization (shared)
│   ├── firebase-config-temp.js  ← Format of firebase.config only
│   ├── scanner.js               ← QR scanner logic
│   ├── professor-dashboard.js   ← Session view and check-out logic
│   ├── dashboard-state.js       ← Auth guard, app state, tab switching
│   ├── dashboard-overview.js    ← Stats cards and room breakdown
│   ├── dashboard-logs.js        ← Log table, void/restore, CSV export
│   ├── dashboard-professors.js  ← Whitelist and block/unblock management
│   ├── dashboard-audit.js       ← Audit log rendering and export
│   └── dashboard-utils.js       ← Shared helpers (formatTimestamp, showToast)
│
└── icons/
    ├── icon-192.png             ← PWA home screen icon
    └── icon-512.png             ← PWA splash icon
```

> All pages must be served from the same origin. Do not open them directly as `file://` URLs.

---

## Getting Started

### 1. Clone the repo and configure Firebase

Edit `js/firebase-config.js` with your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com).

### 2. Set up Firestore Security Rules

In the Firebase Console, go to **Firestore Database → Rules** and paste the contents of `firestore.rules`. These rules enforce that only one professor can occupy a room at a time, among other restrictions.

### 3. Create your first Admin user

1. Sign in with your `@neu.edu.ph` Google account
2. In **Firebase Console → Firestore → `users` collection**, manually create a document with your Firebase Auth UID as the document ID:
   - `uid` — your Firebase Auth UID
   - `email` — your email address
   - `role` — `"admin"`
   - `isBlocked` — `false`
3. Reload the app — you'll be routed to the admin dashboard

### 4. Deploy

```bash
bash deploy.sh
```

This deploys both the hosting files and the Firestore security rules in one step.

---

## How It Works

### For Professors

1. Sign in at `index.html` with your `@neu.edu.ph` Google account
2. Tap **Scan** and point your camera at a room's QR code → check-in is logged
3. Tap **Sessions** to view your active session with a live timer
4. Tap **Check Out from Room** when you're done

### For Admins

- View all professor sessions with check-in and check-out times
- **Void** a log entry (with optional reason) or **Restore** a voided one
- **Export CSV** of all logs
- **Block / Unblock** professor access
- Manage the email **whitelist** — add individually or paste a bulk list
- View the **Audit Log** — a full timeline of every admin action

---

## PWA Installation

Professors can install the app on their phone so it opens like a native app — no App Store required.

**Android (Chrome)**
1. Open `scanner.html` in Chrome
2. Tap the **Add to Home Screen** banner, or use the three-dot menu → **Install app**
3. Tap **Install**

**iOS (Safari)**
1. Open `scanner.html` in **Safari** (must be Safari — Chrome on iOS cannot install PWAs)
2. Tap the **Share** button → **Add to Home Screen**
3. Tap **Add**

---

## Database Schema

<details>
<summary><strong>users</strong></summary>

```json
{
  "uid":         "firebase_uid",
  "email":       "professor@neu.edu.ph",
  "displayName": "Prof. Juan dela Cruz",
  "photoURL":    "https://...",
  "role":        "professor | admin",
  "isBlocked":   false,
  "createdAt":   "(Firestore Timestamp)"
}
```
</details>

<details>
<summary><strong>logs</strong></summary>

```json
{
  "professorUid":   "firebase_uid",
  "professorEmail": "professor@neu.edu.ph",
  "roomNumber":     "M101",
  "timestamp":      "(Firestore Timestamp — check-in)",
  "logoutAt":       "(Firestore Timestamp — check-out)",
  "invalid":        false,
  "invalidatedBy":  "admin@neu.edu.ph",
  "invalidatedAt":  "(Firestore Timestamp)",
  "voidReason":     "Optional reason text"
}
```
</details>

<details>
<summary><strong>activeRooms</strong></summary>

```json
{
  "professorUid":   "firebase_uid",
  "professorEmail": "professor@neu.edu.ph",
  "logDocId":       "logs document ID",
  "roomNumber":     "M101",
  "timestamp":      "(Firestore Timestamp)"
}
```

A document exists here while a room is occupied. It is deleted on check-out.
</details>

<details>
<summary><strong>allowedEmails</strong></summary>

```json
{
  "email":   "professor@neu.edu.ph",
  "addedBy": "admin@neu.edu.ph",
  "addedAt": "(Firestore Timestamp)"
}
```
</details>

<details>
<summary><strong>auditLogs</strong></summary>

```json
{
  "action":         "void_log | restore_log | block | unblock | wl_add | wl_remove | wl_bulk | prof_signin | prof_scan | prof_checkout",
  "adminEmail":     "admin@neu.edu.ph",
  "professorEmail": "professor@neu.edu.ph",
  "timestamp":      "(Firestore Timestamp)"
}
```
</details>

---

## Local Development

To test locally without deploying:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

To test on a phone on the same Wi-Fi network, use your machine's local IP address instead (e.g. `http://192.168.x.x:8080`).

---

## License

**Academic Integrity & Copyright Notice**

This project was developed for academic purposes at NEU. It is intended solely for educational use, evaluation, and portfolio demonstration. 

This is **not** an open-source project. Unauthorized copying, adaptation, distribution, or commercial use of this codebase is strictly prohibited.