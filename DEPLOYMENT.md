# Deployment Guide - Railway

## Prerequisites

1. A [Railway](https://railway.app) account
2. A GitHub repository with this code
3. Environment variables ready (see `backend/.env.example`)

## Setup Steps

### 1. Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select this repository

### 2. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database" → "PostgreSQL"**
3. Railway will automatically provide `DATABASE_URL`

### 3. Configure Backend Service

1. Click **"+ New" → "GitHub Repo"**
2. Select this repo and set **Root Directory** to `/backend`
3. Add environment variables in **Settings → Variables**:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate with: openssl rand -base64 32>
FRONTEND_URL=<your frontend Railway URL>
BACKEND_URL=<your backend Railway URL>
GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth secret>
BUNNY_API_KEY=<your Bunny API key>
BUNNY_LIBRARY_ID=<your Bunny library ID>
BUNNY_CDN_HOSTNAME=<your Bunny CDN hostname>
MOLLIE_API_KEY=<your Mollie API key>
```

4. Railway auto-links `DATABASE_URL` from PostgreSQL

### 4. Configure Frontend Service

1. Click **"+ New" → "GitHub Repo"**  
2. Select this repo and set **Root Directory** to `/frontend`
3. Add environment variable:

```
VITE_API_URL=<your backend Railway URL>
```

Or leave empty if using same domain with proxy.

### 5. Configure Custom Domain (Optional)

1. Go to **Settings → Domains** for each service
2. Add your custom domain
3. Update DNS records as instructed

### 6. Update OAuth Redirect URLs

Update your Google OAuth console with the new callback URL:
```
https://your-backend.up.railway.app/auth/google/callback
```

## GitHub Actions (Optional)

If you want CI/CD via GitHub Actions instead of Railway's auto-deploy:

1. Get your Railway token:
   - Go to Railway → Account Settings → Tokens
   - Create a new token

2. Add to GitHub Secrets:
   - Go to your repo → Settings → Secrets
   - Add `RAILWAY_TOKEN` with your token

3. Disable Railway auto-deploy:
   - In Railway service settings, disable "Auto Deploy"

4. Push to `main` branch to trigger deployment

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (auto-provided by Railway) |
| `JWT_SECRET` | ✅ | Secret for JWT tokens |
| `FRONTEND_URL` | ✅ | Public URL of frontend |
| `BACKEND_URL` | ✅ | Public URL of backend |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `BUNNY_API_KEY` | ✅ | Bunny Stream API key |
| `BUNNY_LIBRARY_ID` | ✅ | Bunny Stream library ID |
| `BUNNY_CDN_HOSTNAME` | ✅ | Bunny CDN hostname |
| `MOLLIE_API_KEY` | ✅ | Mollie payment API key |
| `FACEBOOK_APP_ID` | ❌ | Facebook OAuth app ID |
| `FACEBOOK_APP_SECRET` | ❌ | Facebook OAuth app secret |

## Troubleshooting

### Database migrations fail
Check that `DATABASE_URL` is correctly set and the PostgreSQL service is running.

### OAuth redirects fail
Ensure `FRONTEND_URL` and `BACKEND_URL` match your Railway URLs exactly, and update Google OAuth console.

### Videos don't play
Verify `BUNNY_CDN_HOSTNAME` is correct and matches your Bunny Stream zone.

## Costs Estimate

| Service | Approximate Cost |
|---------|------------------|
| Railway Starter | $5/month (includes $5 usage) |
| PostgreSQL | ~$5/month |
| Backend | ~$5-10/month |
| Frontend | ~$2-5/month |
| **Total** | ~$15-25/month |

Note: Railway bills based on actual usage. Small apps may stay within the $5 starter credit.


