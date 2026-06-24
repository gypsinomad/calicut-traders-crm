# Calicut Traders CRM

A comprehensive Export/Import business CRM with AI integration, WhatsApp Business API, Meta (Facebook/Instagram) integration, and automated Android APK builds.

## Features

- **Dashboard** - Business overview with KPIs and analytics
- **Customer Management** - Full CRM with buyer pipeline
- **Order Management** - Export/import order tracking
- **WhatsApp Integration** - Real WhatsApp Business API messaging
- **Meta Integration** - Facebook/Instagram lead management
- **AI Assistant** - Claude AI powered business assistant
- **Document Management** - Export document generation
- **Compliance Tracking** - Regulatory compliance management
- **Analytics** - Advanced business intelligence
- **Download App** - Android APK distribution page

## Tech Stack

- React + TypeScript + Vite
- TailwindCSS + shadcn/ui
- Firebase (Auth + Firestore + Storage)
- Capacitor (Android)
- GitHub Actions (CI/CD)

## Quick Start - Push Code to GitHub

The source code lives in Google AI Studio. Follow these steps to push it:

### Step 1: Export from AI Studio

1. Go to [Google AI Studio](https://aistudio.google.com/apps/06748a86-265a-4c92-b28a-e182e3ce13f2)
2. Click **Export** > **Download as .zip file**
3. Extract the zip to a local folder

### Step 2: Push to This Repository

```bash
cd calicut-traders-crm  # extracted folder
git init
git remote add origin https://github.com/gypsinomad/calicut-traders-crm.git
git fetch origin
git checkout main
git add .
git commit -m 'feat: add full CRM source code'
git push origin main
```

**OR if you get merge conflicts (repo already has .github folder):**

```bash
cd calicut-traders-crm
git init
git remote add origin https://github.com/gypsinomad/calicut-traders-crm.git
git fetch origin
git merge origin/main --allow-unrelated-histories --strategy-option=theirs
git add .
git commit -m 'feat: add full CRM source code'
git push origin main
```

### Step 3: Add GitHub Secrets

Go to **Settings > Secrets and variables > Actions** and add:

| Secret | Description |
|--------|-------------|
| `KEYSTORE_BASE64` | ✅ Already added |
| `KEY_ALIAS` | ✅ Already added |
| `KEY_PASSWORD` | ✅ Already added |
| `STORE_PASSWORD` | ✅ Already added |
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_META_PAGE_ACCESS_TOKEN` | Meta Page Access Token (optional) |
| `VITE_META_PAGE_ID` | Meta Page ID (optional) |
| `VITE_WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Phone Number ID (optional) |
| `VITE_WHATSAPP_ACCESS_TOKEN` | WhatsApp Access Token (optional) |

### Step 4: Build APK

After pushing code, GitHub Actions will automatically:
1. Build the React app
2. Sync with Capacitor
3. Build signed Android APK
4. Create a GitHub Release with the APK

The APK will be available at: **Releases > Latest Release**

## Local Development

```bash
npm install
npm run dev
```

## Android Build (Local)

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

## Download App

Once the APK is built, access the download page inside the CRM at `/download-app` to get the QR code and installation guide for your team.

## License

Private - Calicut Traders
