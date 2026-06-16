import { Router, Response } from "express";
import { db } from "../db.js";
import { authMiddleware, AuthenticatedRequest } from "./auth.js";
import { sendToUser } from "../sockets.js";

export const friendsRouter = Router();

// SEND FRIEND REQUEST
friendsRouter.post("/request", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUsername } = req.body;
    const currentUserId = req.user!.id;
    const currentUsername = req.user!.username;

    if (!targetUsername) {
      return res.status(400).json({ error: "Specify a recipient username to add as friend." });
    }

    if (targetUsername.trim().toLowerCase() === currentUsername.toLowerCase()) {
      return res.status(400).json({ error: "You cannot send a friend request to yourself." });
    }

    const sender = await db.users.findById(currentUserId);
    const targetUser = await db.users.findByUsername(targetUsername.trim().toLowerCase());

    if (!targetUser) {
      return res.status(404).json({ error: "Requested user does not exist." });
    }

    // Verify friendship duplicate
    const senderFriends = sender.friends || [];
    if (senderFriends.includes(targetUser.username)) {
      return res.status(400).json({ error: "You are already friends with this user." });
    }

    // Verify existing requests
    const outgoing = await db.friends.findPendingOutgoing(currentUserId);
    const alreadySent = outgoing.some((r: any) => r.receiverUsername.toLowerCase() === targetUser.username.toLowerCase());
    if (alreadySent) {
      return res.status(400).json({ error: "You already have a pending outgoing proposal to this user." });
    }

    const incoming = await db.friends.findPendingIncoming(currentUserId);
    const alreadyReceived = incoming.some((r: any) => r.senderUsername.toLowerCase() === targetUser.username.toLowerCase());
    if (alreadyReceived) {
      return res.status(400).json({ error: "This user has already sent you a friend request. Accept that instead." });
    }

    // Create Request
    const request = await db.friends.sendRequest({
      senderId: currentUserId,
      senderUsername: currentUsername,
      senderName: sender.name,
      senderProfilePic: sender.profilePicture || "",
      receiverId: targetUser._id,
      receiverUsername: targetUser.username
    });

    // Create Notification
    const notification = await db.notifications.create({
      recipientId: targetUser._id,
      senderId: currentUserId,
      senderUsername: currentUsername,
      senderName: sender.name,
      senderProfilePic: sender.profilePicture || "",
      type: "friend_request",
      isRead: false
    });

    // Alert target user in real time
    sendToUser(targetUser._id, "new_friend_request", request);
    sendToUser(targetUser._id, "new_notification", notification);

    return res.status(201).json({ message: "Friend request sent successfully.", request });
  } catch (err: any) {
    console.error("Send Friend Request Error:", err);
    return res.status(500).json({ error: "Server error sending friend request." });
  }
});

// GET PENDING REQUESTS (Incoming & Outgoing combined)
friendsRouter.get("/requests", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const incoming = await db.friends.findPendingIncoming(currentUserId);
    const outgoing = await db.friends.findPendingOutgoing(currentUserId);

    return res.status(200).json({ incoming, outgoing });
  } catch (err: any) {
    console.error("Get Pending Requests Error:", err);
    return res.status(500).json({ error: "Server error listing friend requests." });
  }
});

// ACCEPT / REJECT FRIEND REQUEST
friendsRouter.put("/requests/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "accepted" or "rejected"
    const currentUserId = req.user!.id;
    const currentUsername = req.user!.username;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status update must be either accepted or rejected." });
    }

    const request = await db.friends.findRequestById(id);
    if (!request) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    if (request.receiverId !== currentUserId) {
      return res.status(403).json({ error: "Unauthorised action. This request is addressed to another user." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: `This request has already been ${request.status}.` });
    }

    const updatedRequest = await db.friends.updateRequestStatus(id, status);

    const me = await db.users.findById(currentUserId);

    if (status === "accepted" && updatedRequest) {
      // Create and dispatch an accepted notification to the initiator
      const notification = await db.notifications.create({
        recipientId: updatedRequest.senderId,
        senderId: currentUserId,
        senderUsername: currentUsername,
        senderName: me?.name || currentUsername,
        senderProfilePic: me?.profilePicture || "",
        type: "friend_accept",
        isRead: false
      });

      sendToUser(updatedRequest.senderId, "friend_request_accepted", {
        requestId: id,
        newFriend: {
          username: me.username,
          name: me.name,
          profilePicture: me.profilePicture
        }
      });
      sendToUser(updatedRequest.senderId, "new_notification", notification);
    } else if (status === "rejected" && updatedRequest) {
      sendToUser(updatedRequest.senderId, "friend_request_rejected", { requestId: id });
    }

    return res.status(200).json({ message: `Friend request ${status}.`, request: updatedRequest });
  } catch (err: any) {
    console.error("Process Request Error:", err);
    return res.status(500).json({ error: "Server error handling friend request response." });
  }
});

// REMOVE FRIEND
friendsRouter.delete("/remove/:username", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user!.id;

    const success = await db.friends.removeFriend(currentUserId, username.trim().toLowerCase());
    if (!success) {
      return res.status(404).json({ error: "Unable to disconnect. Verify you are active friends first." });
    }

    const targetUser = await db.users.findByUsername(username);
    if (targetUser) {
      // Send real-time unfriend alert to clean frontend cache pools immediately
      sendToUser(targetUser._id, "friend_removed", { friendUsername: req.user!.username });
    }

    return res.status(200).json({ message: `Successfully unfriended ${username}.` });
  } catch (err: any) {
    console.error("Remove Friend Error:", err);
    return res.status(500).json({ error: "Server error removing friends." });
  }
});

// GET FRIENDS LIST FOR USERNAME
friendsRouter.get("/list/:username", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.params;
    const list = await db.friends.findFriendsList(username);
    return res.status(200).json({ friends: list });
  } catch (err: any) {
    console.error("Get Friends List Error:", err);
    return res.status(500).json({ error: "Server error listing friends list." });
  }
});
