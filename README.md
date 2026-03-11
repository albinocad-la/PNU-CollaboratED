# PNU CollaboratED - Netlify Deployment Guide

This project is ready to be deployed to Netlify. Follow these steps:

## 1. Connect to Netlify
- Push your code to a GitHub/GitLab/Bitbucket repository.
- Log in to [Netlify](https://www.netlify.com/) and click **"Add new site"** > **"Import an existing project"**.
- Select your repository.

## 2. Build Settings
The project includes a `netlify.toml` file that automatically configures these settings:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Redirects:** Configured to handle Single Page Application (SPA) routing.

## 3. Environment Variables
You **must** configure the following environment variables in the Netlify dashboard (**Site settings** > **Environment variables**):

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `VITE_FIREBASE_APP_ID` | Your Firebase App ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Your Firestore Database ID |
| `GEMINI_API_KEY` | Your Google Gemini API Key |

> **Note:** You can find these values in your `firebase-applet-config.json` file.

## 4. Google Auth Setup
In the [Firebase Console](https://console.firebase.google.com/):
1. Go to **Authentication** > **Settings** > **Authorized domains**.
2. Add your Netlify site URL (e.g., `your-site-name.netlify.app`) to the list.
