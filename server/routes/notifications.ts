import { Router, Response } from "express";
import { db } from "../db.js";
import { authMiddleware, AuthenticatedRequest } from "./auth.js";

export const notificationsRouter = Router();

// GET ALL USER NOTIFICATIONS
notificationsRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const history = await db.notifications.findByUserId(currentUserId);
    return res.status(200).json({ notifications: history });
  } catch (err: any) {
    console.error("Get Notifications Error:", err);
    return res.status(500).json({ error: "Server error querying notification history." });
  }
});

// MARK SINGLE NOTIFICATION AS READ
notificationsRouter.put("/:id/read", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const notif = await db.notifications.markAsRead(id);
    if (!notif) {
      return res.status(404).json({ error: "Notification not found." });
    }

    if (notif.recipientId !== currentUserId) {
      return res.status(403).json({ error: "Unauthorised access to another user's alert." });
    }

    return res.status(200).json({ message: "Notification marked read.", notification: notif });
  } catch (err: any) {
    console.error("Read Notification Error:", err);
    return res.status(500).json({ error: "Server error marking notification as read." });
  }
});

// MARK ALL AS READ
notificationsRouter.post("/read-all", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const result = await db.notifications.markAllAsRead(currentUserId);
    return res.status(200).json({ message: "All notifications declared read successfully.", result });
  } catch (err: any) {
    console.error("Read All Notifications Error:", err);
    return res.status(500).json({ error: "Server error updating all notifications." });
  }
});

// DELETE NOTIFICATION
notificationsRouter.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.notifications.delete(id);
    return res.status(200).json({ message: "Notification removed successfully." });
  } catch (err: any) {
    console.error("Delete Notification Error:", err);
    return res.status(500).json({ error: "Server error dismissing notification." });
  }
});
