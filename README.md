# DanceClips

Video platform voor het organiseren van dansclips met slow-motion playback, timestamps en collecties.

## Stack

- **Frontend**: Vue 3 + Vite + Tailwind CSS + Pinia
- **Backend**: Express + Passport.js + Prisma
- **Database**: PostgreSQL
- **Auth**: Google & Facebook OAuth2
- **Payments**: Mollie
- **Video**: Bunny Stream

## Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Environment Variables

Maak `.env` bestanden aan:

**backend/.env**
```env
DATABASE_URL="postgresql://videohub:videohub@localhost:5432/videohub"
JWT_SECRET="genereer-een-random-string-van-32-chars"

# OAuth - Google (https://console.cloud.google.com)
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# OAuth - Facebook (https://developers.facebook.com)
FACEBOOK_APP_ID="xxx"
FACEBOOK_APP_SECRET="xxx"

# Mollie (https://mollie.com)
MOLLIE_API_KEY="test_xxx"

# Bunny (https://bunny.net)
BUNNY_API_KEY="xxx"
BUNNY_LIBRARY_ID="xxx"
BUNNY_CDN_HOSTNAME="xxx.b-cdn.net"

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
```

**frontend/.env**
```env
VITE_API_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Start Development

```bash
# Vanuit root
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## OAuth Setup

### Google
1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. Maak een project aan
3. APIs & Services → Credentials → Create OAuth Client ID
4. Authorized redirect URI: `http://localhost:3000/auth/google/callback`

### Facebook
1. Ga naar [Facebook Developers](https://developers.facebook.com)
2. Maak een app aan (Consumer type)
3. Facebook Login → Settings
4. Valid OAuth Redirect URIs: `http://localhost:3000/auth/facebook/callback`

## Features

- ✅ OAuth2 login (Google, Facebook)
- ✅ Video collecties aanmaken
- ✅ Video upload naar Bunny Stream
- ✅ Clip timestamps (start/eind)
- ✅ Slow-motion playback (0.25x - 2x)
- ✅ Credit systeem met Mollie payments
- ✅ Dance moves categoriseren

## API Endpoints

### Auth
- `GET /auth/google` - Start Google OAuth
- `GET /auth/facebook` - Start Facebook OAuth
- `GET /auth/me` - Get current user

### Collections
- `GET /api/collections` - List user's collections
- `POST /api/collections` - Create collection
- `GET /api/collections/:id` - Get collection with clips
- `PATCH /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection

### Clips
- `POST /api/clips/upload-url` - Get Bunny upload URL
- `POST /api/clips/confirm-upload` - Confirm upload & create clip
- `PATCH /api/clips/:id` - Update clip
- `DELETE /api/clips/:id` - Delete clip
- `GET /api/clips/search` - Search clips

### Credits
- `GET /api/credits/packages` - List credit packages
- `GET /api/credits/balance` - Get balance & history
- `POST /api/credits/purchase` - Purchase credits

