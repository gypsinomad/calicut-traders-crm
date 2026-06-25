# Calicut Traders CRM — Complete Setup Guide

## Prerequisites
- Node.js 18+
- Java 17 (for Android builds)
- Android Studio (for local Android builds)
- Git

---

## 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/calicut-traders-crm.git
cd calicut-traders-crm
npm install
```

---

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```
# Firebase (get from Firebase Console > Project Settings > Your Apps)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# GitHub (for Download App page)
VITE_GITHUB_OWNER=your-github-username
VITE_GITHUB_REPO=calicut-traders-crm
```

---

## 3. Run Locally

```bash
npm run dev
```

Open http://localhost:5173

---

## 4. Generate Android Keystore (ONE TIME ONLY)

Run this command and save the keystore file securely:

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias calicut-traders \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted for:
- **Store password** — save this as `STORE_PASSWORD`
- **Key alias** — save as `KEY_ALIAS` (use `calicut-traders`)
- **Key password** — save as `KEY_PASSWORD`

**IMPORTANT: Never commit `release.keystore` to git!**

---

## 5. Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value |
|---|---|
| `KEYSTORE_BASE64` | Base64 of your keystore (see below) |
| `KEY_ALIAS` | Your key alias (e.g. `calicut-traders`) |
| `KEY_PASSWORD` | Your key password |
| `STORE_PASSWORD` | Your store password |
| `VITE_FIREBASE_API_KEY` | From Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN` | From Firebase console |
| `VITE_FIREBASE_PROJECT_ID` | From Firebase console |
| `VITE_FIREBASE_STORAGE_BUCKET` | From Firebase console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase console |
| `VITE_FIREBASE_APP_ID` | From Firebase console |

### Convert keystore to Base64:

```bash
# Linux/Mac
base64 -w 0 release.keystore

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('release.keystore'))
```

Copy the output and paste it as the `KEYSTORE_BASE64` secret.

---

## 6. Push to GitHub → APK Auto-Builds

```bash
git add .
git commit -m "Initial release"
git push origin main
```

GitHub Actions will automatically:
1. Build the Vite web app
2. Run `npx cap sync android`
3. Build a signed release APK
4. Create a GitHub Release with the APK attached
5. The **Download App** page inside the CRM will show the new APK automatically

---

## 7. Access the Download App Page

Once deployed, the Download App page is at:
```
https://your-app-url.com/download-app
```

Share this URL with your team. They can:
- Tap the green **Download APK** button
- Scan the QR code with any Android phone
- Copy the direct download link

---

## Useful Commands

```bash
# Build web app
npm run build

# Sync to Android (after building)
npx cap sync android

# Open Android Studio
npx cap open android

# Build debug APK locally (requires Android Studio)
cd android && ./gradlew assembleDebug

# Build release APK locally (requires keystore)
cd android && ./gradlew assembleRelease
```