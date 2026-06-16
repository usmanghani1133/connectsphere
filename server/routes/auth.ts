import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db.js";

export const authRouter = Router();

export const JWT_SECRET = process.env.JWT_SECRET || "connect_sphere_secret_99884451122";

// Secure, zero-compile-dependency password hashing & verification
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, originalHash] = stored.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

// Authenticated Request Extension
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

// Authentication Interceptor Middleware
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. Token is missing." });
  }

  const chunks = authHeader.split(" ");
  if (chunks.length !== 2 || chunks[0] !== "Bearer") {
    return res.status(401).json({ error: "Invalid header format. Use 'Bearer <token>'." });
  }

  const token = chunks[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed. Token is invalid or expired." });
  }
}

// REGISTER API
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: "Registration fields (name, username, email, password) are all required." });
    }

    if (username.length < 3 || username.includes(" ")) {
      return res.status(400).json({ error: "Username must be at least 3 characters and must not contain spaces." });
    }

    const lowerUsername = username.trim().toLowerCase();
    const lowerEmail = email.trim().toLowerCase();

    // Check existing
    const existingUser = await db.users.findByUsername(lowerUsername);
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    const existingEmail = await db.users.findByEmail(lowerEmail);
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const hashedPassword = hashPassword(password);

    const user = await db.users.create({
      name: name.trim(),
      username: lowerUsername,
      email: lowerEmail,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "30d" });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        profilePicture: user.profilePicture || "",
        coverPhoto: user.coverPhoto || "",
        friends: user.friends || [],
        privacy: user.privacy || "public"
      }
    });
  } catch (err: any) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: "Server error occurred during sign up." });
  }
});

// LOGIN API
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: "Username/Email and password are required." });
    }

    const term = usernameOrEmail.trim().toLowerCase();
    let user = await db.users.findByUsername(term);
    if (!user) {
      user = await db.users.findByEmail(term);
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid username, email, or password." });
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid username, email, or password." });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "30d" });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        profilePicture: user.profilePicture || "",
        coverPhoto: user.coverPhoto || "",
        friends: user.friends || [],
        privacy: user.privacy || "public"
      }
    });
  } catch (err: any) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Server error occurred during login." });
  }
});

// ME/SESSION API
authRouter.get("/me", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.users.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "User session expired or user not found." });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        profilePicture: user.profilePicture || "",
        coverPhoto: user.coverPhoto || "",
        friends: user.friends || [],
        privacy: user.privacy || "public"
      }
    });
  } catch (err: any) {
    console.error("Me API Error:", err);
    return res.status(500).json({ error: "Server error occurred while validating user session." });
  }
});
