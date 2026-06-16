import { Router, Response } from "express";
import { db } from "../db.js";
import { authMiddleware, AuthenticatedRequest } from "./auth.js";

export const usersRouter = Router();

// SEARCH USERS
usersRouter.get("/search", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim() === "") {
      return res.status(200).json({ results: [] });
    }

    const results = await db.users.search(query.trim());
    // Strip passwords before returning
    const safeResults = results.map((u: any) => ({
      id: u._id,
      name: u.name,
      username: u.username,
      profilePicture: u.profilePicture || "",
      bio: u.bio || ""
    }));

    return res.status(200).json({ results: safeResults });
  } catch (err: any) {
    console.error("Search Users Error:", err);
    return res.status(500).json({ error: "Server error during search." });
  }
});

// GET PROFILE DETAILS BY USERNAME (With Privacy Checks!)
usersRouter.get("/profile/:username", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.params;
    const currentUsername = req.user!.username.toLowerCase();
    const currentUserId = req.user!.id;

    const profileUser = await db.users.findByUsername(username);
    if (!profileUser) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const isSelf = profileUser.username.toLowerCase() === currentUsername;
    const isFriend = profileUser.friends && profileUser.friends.includes(req.user!.username);

    // Apply Profile Privacy Enforcement
    const privacy = profileUser.privacy || "public";

    if (!isSelf) {
      if (privacy === "private") {
        return res.status(403).json({
          error: "This profile is private.",
          privacy,
          user: {
            id: profileUser._id,
            name: profileUser.name,
            username: profileUser.username,
            profilePicture: profileUser.profilePicture || ""
          }
        });
      } else if (privacy === "friends" && !isFriend) {
        return res.status(403).json({
          error: "This profile is friends-only.",
          privacy,
          user: {
            id: profileUser._id,
            name: profileUser.name,
            username: profileUser.username,
            profilePicture: profileUser.profilePicture || ""
          }
        });
      }
    }

    return res.status(200).json({
      isSelf,
      isFriend,
      profile: {
        id: profileUser._id,
        name: profileUser.name,
        username: profileUser.username,
        email: isSelf ? profileUser.email : undefined, // Shield email for privacy
        bio: profileUser.bio || "",
        profilePicture: profileUser.profilePicture || "",
        coverPhoto: profileUser.coverPhoto || "",
        friendsCount: profileUser.friends ? profileUser.friends.length : 0,
        friends: profileUser.friends || [],
        privacy
      }
    });
  } catch (err: any) {
    console.error("Get Profile Error:", err);
    return res.status(500).json({ error: "Server error while fetching profile." });
  }
});

// UPDATE PROFILE DETAILS (Name, Bio, Profile Picture, Cover Photo)
usersRouter.put("/profile/update", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, bio, profilePicture, coverPhoto, privacy } = req.body;
    const currentUserId = req.user!.id;

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    if (coverPhoto !== undefined) updates.coverPhoto = coverPhoto;
    if (privacy !== undefined && ["public", "friends", "private"].includes(privacy)) {
      updates.privacy = privacy;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No update parameters provided." });
    }

    const updatedUser = await db.users.update(currentUserId, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio || "",
        profilePicture: updatedUser.profilePicture || "",
        coverPhoto: updatedUser.coverPhoto || "",
        friends: updatedUser.friends || [],
        privacy: updatedUser.privacy || "public"
      }
    });
  } catch (err: any) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ error: "Server error updating profile details." });
  }
});
