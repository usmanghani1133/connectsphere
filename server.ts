import express from "express";
import { createServer } from "http";
import path from "path";
import * as fs from "fs";
import { createServer as createViteServer } from "vite";
import { initSockets } from "./server/sockets.js";
import cors from "cors";

// Import API Routers
import { authRouter } from "./server/routes/auth.js";
import { usersRouter } from "./server/routes/users.js";
import { postsRouter } from "./server/routes/posts.js";
import { commentsRouter } from "./server/routes/comments.js";
import { friendsRouter } from "./server/routes/friends.js";
import { notificationsRouter } from "./server/routes/notifications.js";

// Ensure local directories exist (used in dev mode only)
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PORT = parseInt(process.env.PORT || "3000", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── CORS ────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: IS_PRODUCTION
        ? [CLIENT_URL, /\.onrender\.com$/, /\.vercel\.app$/]
        : ["http://localhost:3000", "http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.options("*", cors());

  // Initialize Socket.IO with HTTP server
  initSockets(server);

  // Body parser with generous limits for base64 media uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve static files in public folder
  const publicPath = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }
  app.use(express.static(publicPath));

  // Serve local uploaded files (dev only — Cloudinary handles production)
  if (!IS_PRODUCTION) {
    app.use("/uploads", express.static(UPLOADS_DIR));
  }

  // ── HEALTH CHECK ────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    res.json({
      status: "online",
      project: "ConnectSphere Social Platform",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date(),
    });
  });

  // ── MEDIA UPLOAD ENDPOINT ─────────────────────────────────────────
  // Cloudinary in production, local filesystem in development
  app.post("/api/media/upload", async (req, res) => {
    try {
      const { fileData, fileName, fileType } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: "Missing file data stream for upload." });
      }

      // ── Cloudinary (Production) ──────────────────────────────────
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const cloudApiKey = process.env.CLOUDINARY_API_KEY;
      const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;

      if (IS_PRODUCTION && cloudName && cloudApiKey && cloudApiSecret) {
        try {
          const { v2: cloudinary } = await import("cloudinary");
          cloudinary.config({
            cloud_name: cloudName,
            api_key: cloudApiKey,
            api_secret: cloudApiSecret,
          });

          const uploadResult = await cloudinary.uploader.upload(fileData, {
            folder: "connectsphere",
            resource_type: "auto",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          });

          return res.status(200).json({
            message: "File uploaded to Cloudinary successfully.",
            url: uploadResult.secure_url,
            type: fileType || "image",
          });
        } catch (cloudErr: any) {
          console.error("Cloudinary upload error:", cloudErr.message);
          // Fall through to local save as backup
        }
      }

      // ── Local filesystem (Development) ───────────────────────────
      const ext = fileType?.split("/")[1] || "png";
      const cleanName = `media_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
      const savePath = path.join(UPLOADS_DIR, cleanName);

      let buffer: Buffer;
      if (fileData.includes("base64,")) {
        buffer = Buffer.from(fileData.split("base64,")[1], "base64");
      } else {
        buffer = Buffer.from(fileData, "base64");
      }

      fs.writeFileSync(savePath, buffer);
      const fileUrl = `/uploads/${cleanName}`;

      return res.status(200).json({
        message: "File compiled and stored successfully.",
        url: fileUrl,
        type: fileType || "image",
      });
    } catch (err: any) {
      console.error("Media upload error:", err);
      return res.status(500).json({ error: "Failed to store media upload." });
    }
  });

  // ── API ROUTERS ────────────────────────────────────────────────────
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/friends", friendsRouter);
  app.use("/api/notifications", notificationsRouter);

  // ── FRONTEND SERVING ───────────────────────────────────────────────
  if (!IS_PRODUCTION) {
    console.log("Injecting Vite middleware for real-time asset compiling...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production mode — serving built frontend...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Catch-all for SPA routing — must come after all API routes
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  // ── START SERVER ───────────────────────────────────────────────────
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(` ConnectSphere Server — ${IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"}`);
    console.log(` HTTP/WS listening on port ${PORT}`);
    console.log(` Database: ${process.env.MONGODB_URI ? "MongoDB Atlas" : "Local JSON Standby"}`);
    console.log(` Media: ${process.env.CLOUDINARY_CLOUD_NAME ? "Cloudinary CDN" : "Local Filesystem"}`);
    console.log(`====================================================`);
  });
}

startServer();
