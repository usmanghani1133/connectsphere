import { Router, Response } from "express";
import { db } from "../db.js";
import { authMiddleware, AuthenticatedRequest } from "./auth.js";
import { broadcastEvent, sendToUser } from "../sockets.js";

export const commentsRouter = Router();

// ADD COMMENT
commentsRouter.post("/:postId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user!.id;
    const currentUsername = req.user!.username;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Comment message content cannot be blank." });
    }

    const post = await db.posts.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Parent post thread not found." });
    }

    const me = await db.users.findById(currentUserId);
    if (!me) {
      return res.status(404).json({ error: "User session not found." });
    }

    const comment = await db.comments.create({
      postId,
      userId: currentUserId,
      username: currentUsername,
      userDisplayName: me.name,
      userProfilePic: me.profilePicture || "",
      content: content.trim()
    });

    // Notify all listeners of standard comments stream
    broadcastEvent("new_comment", comment);

    // Push separate notification to Post Owner (if not self commenting)
    if (post.userId !== currentUserId) {
      const notification = await db.notifications.create({
        recipientId: post.userId,
        senderId: currentUserId,
        senderUsername: currentUsername,
        senderName: me.name,
        senderProfilePic: me.profilePicture || "",
        type: "comment",
        postId: post._id,
        isRead: false
      });

      sendToUser(post.userId, "new_notification", notification);
    }

    return res.status(201).json({ message: "Comment added successfully.", comment });
  } catch (err: any) {
    console.error("Add Comment Error:", err);
    return res.status(500).json({ error: "Server error creating comment." });
  }
});

// GET COMMENTS LIST FOR POST
commentsRouter.get("/:postId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const commentsList = await db.comments.findByPostId(postId);
    return res.status(200).json({ comments: commentsList });
  } catch (err: any) {
    console.error("Get Comments Error:", err);
    return res.status(500).json({ error: "Server error querying comments." });
  }
});

// DELETE COMMENT
commentsRouter.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const comment = await db.comments.findById(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment thread not found." });
    }

    // Auth validation: only comment author OR post owner can delete comments
    const post = await db.posts.findById(comment.postId);
    const isOwnerOfPost = post && post.userId === currentUserId;
    const isOwnerOfComment = comment.userId === currentUserId;

    if (!isOwnerOfPost && !isOwnerOfComment) {
      return res.status(403).json({ error: "Unauthorised. Only commentators or post hosts can delete comments." });
    }

    await db.comments.delete(id);

    // Sync Socket listeners
    broadcastEvent("comment_deleted", { commentId: id, postId: comment.postId });

    return res.status(200).json({ message: "Comment deleted successfully." });
  } catch (err: any) {
    console.error("Delete Comment Error:", err);
    return res.status(500).json({ error: "Server error removing comments." });
  }
});
