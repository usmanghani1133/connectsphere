# ConnectSphere — Social Networking Platform

A modern, full-stack campus social networking platform built with React, Express, Socket.IO, and MongoDB.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express + Socket.IO
- **Database:** MongoDB Atlas (with local JSON fallback for development)
- **Media:** Cloudinary (production) / Local filesystem (development)
- **Auth:** JWT

## Features

- 🔐 User authentication (register/login)
- 📰 Real-time social feed (posts, images, videos)
- ❤️ Likes, comments, and reactions
- 👥 Friend connections and requests
- 🔔 Real-time notifications via Socket.IO
- 🔒 Privacy controls (public / friends / private)
- 👤 Profile customization

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Start development server (Vite + Express together)
npm run dev
```

The app runs at `http://localhost:3000`.  
No database setup needed for development — it uses a local JSON file store automatically.

## Production Deployment

See [render.yaml](./render.yaml) for one-click Render.com deployment.

### Environment Variables Required in Production

| Variable | Description |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random 64-char secret string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLIENT_URL` | Your deployed app URL |

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with Vite HMR |
| `npm run build` | Build frontend + bundle server |
| `npm run start` | Start production server |
| `npm run lint` | TypeScript type check |
