import { Router, Response } from "express";
import { db } from "../db.js";
import { authMiddleware, AuthenticatedRequest } from "./auth.js";
import { broadcastEvent, sendToUser } from "../sockets.js";

export const postsRouter = Router();

// CREATE POST
postsRouter.post("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, type, mediaUrls, privacy } = req.body;
    const currentUserId = req.user!.id;

    const user = await db.users.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: "Authenticated user not found." });
    }

    if (!content && (!mediaUrls || mediaUrls.length === 0)) {
      return res.status(400).json({ error: "Post cannot be empty. Specify writing text or media files." });
    }

    const post = await db.posts.create({
      userId: currentUserId,
      username: user.username,
      userDisplayName: user.name,
      userProfilePic: user.profilePicture || "",
      content: content ? content.trim() : "",
      type: type || "text",
      mediaUrls: mediaUrls || [],
      privacy: privacy || "public"
    });

    // Broadcast new post to feed subscribers (real-time notification of a new feed entry)
    broadcastEvent("new_feed_post", post);

    return res.status(201).json({ message: "Post shared successfully", post });
  } catch (err: any) {
    console.error("Create Post Error:", err);
    return res.status(500).json({ error: "Server error while creating post." });
  }
});

// GET FEED (All posts visible to current user based on Privacy Rules)
postsRouter.get("/feed", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const user = await db.users.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const friendsList = user.friends || []; // String names
    const posts = await db.posts.findFeed(currentUserId, friendsList);

    return res.status(200).json({ feed: posts });
  } catch (err: any) {
    console.error("Get Feed Error:", err);
    return res.status(500).json({ error: "Server error loading social feed." });
  }
});

// GET POST DETAILS
postsRouter.get("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const post = await db.posts.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    // Privacy Verification
    if (post.privacy === "private" && post.userId !== currentUserId) {
      return res.status(403).json({ error: "This post is marked private as owned by another user." });
    }

    const me = await db.users.findById(currentUserId);
    if (post.privacy === "friends" && post.userId !== currentUserId) {
      const isFriend = me && me.friends && (me.friends.includes(post.username) || me.friends.includes(post.userId));
      if (!isFriend) {
        return res.status(403).json({ error: "This post is visible to author's friends only." });
      }
    }

    return res.status(200).json({ post });
  } catch (err: any) {
    console.error("Get Post Detail Error:", err);
    return res.status(500).json({ error: "Server error loading post details." });
  }
});

// EDIT POST
postsRouter.put("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, privacy, type, mediaUrls } = req.body;
    const currentUserId = req.user!.id;

    const post = await db.posts.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    if (post.userId !== currentUserId) {
      return res.status(403).json({ error: "Unauthorised. Only creators can edit post." });
    }

    const updates: any = {};
    if (content !== undefined) updates.content = content.trim();
    if (privacy !== undefined && ["public", "friends", "private"].includes(privacy)) updates.privacy = privacy;
    if (type !== undefined) updates.type = type;
    if (mediaUrls !== undefined) updates.mediaUrls = mediaUrls;

    const updated = await db.posts.update(id, updates);
    
    // Broadcast real-time update
    broadcastEvent("post_modified", updated);

    return res.status(200).json({ message: "Post edited successfully.", post: updated });
  } catch (err: any) {
    console.error("Edit Post Error:", err);
    return res.status(500).json({ error: "Server error altering post." });
  }
});

// DELETE POST
postsRouter.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const post = await db.posts.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    if (post.userId !== currentUserId) {
      return res.status(403).json({ error: "Unauthorised. Only owners can delete posts." });
    }

    await db.posts.delete(id);

    // Broadcast deletion
    broadcastEvent("post_deleted", { postId: id });

    return res.status(200).json({ message: "Post erased successfully." });
  } catch (err: any) {
    console.error("Delete Post Error:", err);
    return res.status(500).json({ error: "Server error deleting post." });
  }
});

// TOGGLE LIKE (Like / Unlike)
postsRouter.post("/:id/like", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUsername = req.user!.username;

    const post = await db.posts.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    let likes = post.likes || [];
    const idx = likes.indexOf(currentUsername);
    let liked = false;

    if (idx >= 0) {
      // Unlike
      likes = likes.filter((uname: string) => uname !== currentUsername);
    } else {
      // Like
      likes.push(currentUsername);
      liked = true;
    }

    const updated = await db.posts.update(id, { likes });

    // Emit live Socket update to synchronize interface instantly
    broadcastEvent("post_like_changed", { postId: id, likes });

    // Send real-time notification if liked and post owner is someone else
    if (liked && post.userId !== currentUserId) {
      const likingUser = await db.users.findById(currentUserId);
      
      const notification = await db.notifications.create({
        recipientId: post.userId,
        senderId: currentUserId,
        senderUsername: currentUsername,
        senderName: likingUser?.name || currentUsername,
        senderProfilePic: likingUser?.profilePicture || "",
        type: "like",
        postId: post._id,
        isRead: false
      });

      // Dispatch live custom event
      sendToUser(post.userId, "new_notification", notification);
    }

    return res.status(200).json({ message: liked ? "Liked post" : "Unliked post", likes, liked });
  } catch (err: any) {
    console.error("Toggle Like Error:", err);
    return res.status(500).json({ error: "Server error updating likes." });
  }
});
