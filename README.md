# Mental Health Summit

Feedback form, Google Sheets database, and e-certificates with QR verification. Built to handle 1,700+ participants submitting around the same time.

## What participants do

1. Rate the venue, each speaker, and the seminar as a whole.
2. Submit comments.
3. Receive an e-certificate with a unique ID and QR code.
4. Scanning the QR code opens that same certificate.

One email issues one certificate. A repeat submission returns the existing certificate instead of creating a duplicate.

## 1. Google Sheet (main database)

1. Create a Google Sheet.
2. Open **Extensions → Apps Script**.
3. Paste `apps-script/Code.gs` into `Code.gs`. That file already includes the QR certificate page, so a second HTML file is optional.
4. Run `setupSummitSheet` once (authorize the script).
5. After any edit, deploy a **new version** of the web app (not only Save).
6. Deploy **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the web app URL.

The `Submissions` tab stores every response and certificate ID. That sheet is the source of truth.

## 2. Frontend

In `my-frontend/.env`:

```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_PUBLIC_BASE_URL=https://your-deployed-site
```

Edit speaker names in `my-frontend/src/config.js`.

Replace the placeholder art by swapping `my-frontend/public/certificate-template.svg` (or point `Certificate.jsx` at a PNG you add). The name, date, ID, and QR overlay stay in the same positions.

```bash
cd my-frontend
npm install
npm run dev
```

Without `VITE_APPS_SCRIPT_URL`, the app stores responses in this browser only so you can preview the form and certificate. Connect Apps Script before the live event.

## 3. Capacity (1,700+ participants)

- Google Sheets can hold the rows; writes use `LockService` so two people cannot get the same ID.
- The form retries automatically if Google is busy (common when many people submit at once).
- Google allows a limited number of simultaneous script runs. Retries spread the load instead of failing immediately.
- Certificate lookups are read-only and do not block new submissions.
- The QR code points at the Apps Script certificate page, so phones can open a certificate without using localhost.

If more than about 30 people hit Submit in the same second, some will wait a few extra seconds. That is expected and handled.

## 4. After the event

Open the Google Sheet to review venue scores, speaker scores, and seminar comments. Filter or chart from that tab; you do not need a second database.
