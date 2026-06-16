import mongoose, { Schema, Document } from "mongoose";
import * as fs from "fs";
import * as path from "path";

// Define fallback directory
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check MongoDB URI
const mongoUri = process.env.MONGODB_URI;
let isConnected = false;

if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("Connected to MongoDB Atlas successfully");
      isConnected = true;
    })
    .catch((err) => {
      console.error("MongoDB Atlas connection failed. Falling back to Local JSON Files.", err);
      isConnected = false;
    });
} else {
  console.log("No MONGODB_URI found. ConnectSphere is running with a high-performance Local JSON File Database.");
}

// Helper to manage local fallback storage
class LocalStore<T extends { _id: string }> {
  private filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(DATA_DIR, `${filename}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), "utf-8");
    }
  }

  read(): T[] {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  write(data: T[]) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing to file database: ", err);
    }
  }

  find(query: Partial<T> | ((item: T) => boolean) = {}): T[] {
    const list = this.read();
    if (typeof query === "function") {
      return list.filter(query);
    }
    return list.filter((item) => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  findOne(query: Partial<T> | ((item: T) => boolean)): T | null {
    const results = this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  findById(id: string): T | null {
    return this.findOne({ _id: id } as any);
  }

  save(doc: T): T {
    const list = this.read();
    const idx = list.findIndex((item) => item._id === doc._id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...doc };
    } else {
      list.push(doc);
    }
    this.write(list);
    return doc;
  }

  deleteById(id: string): boolean {
    const list = this.read();
    const filtered = list.filter((item) => item._id !== id);
    if (filtered.length !== list.length) {
      this.write(filtered);
      return true;
    }
    return false;
  }
}

// Initialize Local Stores
export const userStore = new LocalStore<any>("users");
export const postStore = new LocalStore<any>("posts");
export const commentStore = new LocalStore<any>("comments");
export const friendRequestStore = new LocalStore<any>("friend_requests");
export const notificationStore = new LocalStore<any>("notifications");

// --- MONGOOSE SCHEMAS (For production scale with MongoDB Atlas) ---

// 1. User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  coverPhoto: { type: String, default: "" },
  friends: [{ type: String }], // Array of Usernames or IDs
  privacy: { type: String, enum: ["public", "friends", "private"], default: "public" },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  userDisplayName: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  content: { type: String, default: "" },
  type: { type: String, enum: ["text", "image", "video"], default: "text" },
  mediaUrls: [{ type: String }], // Cloudinary or Base64/local reference
  likes: [{ type: String }], // Array of usernames who liked
  commentsCount: { type: Number, default: 0 },
  privacy: { type: String, enum: ["public", "friends", "private"], default: "public" },
  createdAt: { type: Date, default: Date.now }
});

const CommentSchema = new Schema({
  postId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  userDisplayName: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const FriendRequestSchema = new Schema({
  senderId: { type: String, required: true },
  senderUsername: { type: String, required: true },
  senderName: { type: String, required: true },
  senderProfilePic: { type: String, default: "" },
  receiverId: { type: String, required: true },
  receiverUsername: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

const NotificationSchema = new Schema({
  recipientId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  senderUsername: { type: String, required: true },
  senderName: { type: String, required: true },
  senderProfilePic: { type: String, default: "" },
  type: { type: String, enum: ["like", "comment", "friend_request", "friend_accept"], required: true },
  postId: { type: String, default: "" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Mongoose model registration (guards if already compiled)
export const UserMongoose = (mongoose.models.User || mongoose.model("User", UserSchema)) as any;
export const PostMongoose = (mongoose.models.Post || mongoose.model("Post", PostSchema)) as any;
export const CommentMongoose = (mongoose.models.Comment || mongoose.model("Comment", CommentSchema)) as any;
export const FriendRequestMongoose = (mongoose.models.FriendRequest || mongoose.model("FriendRequest", FriendRequestSchema)) as any;
export const NotificationMongoose = (mongoose.models.Notification || mongoose.model("Notification", NotificationSchema)) as any;

// --- UNIFIED DATA ACCESS LAYER (Bridges Mongoose and Local fallback transparently) ---
export const db = {
  getIsConnected() {
    return isConnected;
  },

  // --- USER PERSISTENCE ---
  users: {
    async create(data: any) {
      if (isConnected) {
        const user = new UserMongoose(data);
        return await user.save();
      } else {
        const _id = "u_" + Math.random().toString(36).substr(2, 9);
        const newUser = { _id, createdAt: new Date(), friends: [], privacy: "public", profilePicture: "", coverPhoto: "", bio: "", ...data };
        userStore.save(newUser);
        return newUser;
      }
    },

    async findByUsername(username: string) {
      if (isConnected) {
        return await UserMongoose.findOne({ username });
      } else {
        return userStore.findOne((u) => u.username.toLowerCase() === username.toLowerCase());
      }
    },

    async findByEmail(email: string) {
      if (isConnected) {
        return await UserMongoose.findOne({ email });
      } else {
        return userStore.findOne((u) => u.email.toLowerCase() === email.toLowerCase());
      }
    },

    async findById(id: string) {
      if (isConnected) {
        return await UserMongoose.findById(id);
      } else {
        return userStore.findById(id);
      }
    },

    async update(id: string, updates: any) {
      if (isConnected) {
        return await UserMongoose.findByIdAndUpdate(id, { $set: updates }, { new: true });
      } else {
        const user = userStore.findById(id);
        if (user) {
          const updated = { ...user, ...updates };
          userStore.save(updated);
          return updated;
        }
        return null;
      }
    },

    async search(query: string) {
      if (isConnected) {
        return await UserMongoose.find({
          $or: [
            { name: { $regex: query, $options: "i" } },
            { username: { $regex: query, $options: "i" } }
          ]
        }).limit(10);
      } else {
        const list = userStore.read();
        const lower = query.toLowerCase();
        return list
          .filter((u) => u.name.toLowerCase().includes(lower) || u.username.toLowerCase().includes(lower))
          .slice(0, 10);
      }
    }
  },

  // --- POST PERSISTENCE ---
  posts: {
    async create(data: any) {
      if (isConnected) {
        const post = new PostMongoose(data);
        return await post.save();
      } else {
        const _id = "p_" + Math.random().toString(36).substr(2, 9);
        const newPost = { _id, createdAt: new Date(), likes: [], commentsCount: 0, mediaUrls: [], privacy: "public", ...data };
        postStore.save(newPost);
        return newPost;
      }
    },

    async findFeed(currentUserId: string, currentUserFriends: string[], limit = 20) {
      if (isConnected) {
        // Find posts that are public, OR created by the user, OR (created by friends AND private = friends)
        return await PostMongoose.find({
          $or: [
            { privacy: "public" },
            { userId: currentUserId },
            { $and: [{ userId: { $in: currentUserFriends } }, { privacy: "friends" }] }
          ]
        })
          .sort({ createdAt: -1 })
          .limit(limit);
      } else {
        const list = postStore.read();
        return list
          .filter((post) => {
            if (post.privacy === "public") return true;
            if (post.userId === currentUserId) return true;
            if (post.privacy === "friends" && currentUserFriends.includes(post.username || post.userId)) return true;
            return false;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      }
    },

    async findByUserId(userId: string) {
      if (isConnected) {
        return await PostMongoose.find({ userId }).sort({ createdAt: -1 });
      } else {
        return postStore.find({ userId }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },

    async findById(id: string) {
      if (isConnected) {
        return await PostMongoose.findById(id);
      } else {
        return postStore.findById(id);
      }
    },

    async update(id: string, updates: any) {
      if (isConnected) {
        return await PostMongoose.findByIdAndUpdate(id, { $set: updates }, { new: true });
      } else {
        const post = postStore.findById(id);
        if (post) {
          const updated = { ...post, ...updates };
          postStore.save(updated);
          return updated;
        }
        return null;
      }
    },

    async delete(id: string) {
      if (isConnected) {
        return await PostMongoose.findByIdAndDelete(id);
      } else {
        return postStore.deleteById(id);
      }
    }
  },

  // --- COMMENT PERSISTENCE ---
  comments: {
    async create(data: any) {
      if (isConnected) {
        const comment = new CommentMongoose(data);
        const saved = await comment.save();
        await PostMongoose.findByIdAndUpdate(data.postId, { $inc: { commentsCount: 1 } });
        return saved;
      } else {
        const _id = "c_" + Math.random().toString(36).substr(2, 9);
        const newComment = { _id, createdAt: new Date(), ...data };
        commentStore.save(newComment);

        const post = postStore.findById(data.postId);
        if (post) {
          post.commentsCount = (post.commentsCount || 0) + 1;
          postStore.save(post);
        }
        return newComment;
      }
    },

    async findByPostId(postId: string) {
      if (isConnected) {
        return await CommentMongoose.find({ postId }).sort({ createdAt: 1 });
      } else {
        return commentStore.find({ postId }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    },

    async findById(id: string) {
      if (isConnected) {
        return await CommentMongoose.findById(id);
      } else {
        return commentStore.findById(id);
      }
    },

    async delete(id: string) {
      if (isConnected) {
        const comment = await CommentMongoose.findById(id);
        if (comment) {
          await PostMongoose.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
          return await CommentMongoose.findByIdAndDelete(id);
        }
        return null;
      } else {
        const comment = commentStore.findById(id);
        if (comment) {
          commentStore.deleteById(id);
          const post = postStore.findById(comment.postId);
          if (post) {
            post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
            postStore.save(post);
          }
          return comment;
        }
        return null;
      }
    }
  },

  // --- FRIEND REQUEST PERSISTENCE ---
  friends: {
    async sendRequest(data: any) {
      if (isConnected) {
        const request = new FriendRequestMongoose(data);
        return await request.save();
      } else {
        const _id = "fr_" + Math.random().toString(36).substr(2, 9);
        const newReq = { _id, createdAt: new Date(), status: "pending", ...data };
        friendRequestStore.save(newReq);
        return newReq;
      }
    },

    async findPendingIncoming(userId: string) {
      if (isConnected) {
        return await FriendRequestMongoose.find({ receiverId: userId, status: "pending" });
      } else {
        return friendRequestStore.find({ receiverId: userId, status: "pending" });
      }
    },

    async findPendingOutgoing(userId: string) {
      if (isConnected) {
        return await FriendRequestMongoose.find({ senderId: userId, status: "pending" });
      } else {
        return friendRequestStore.find({ senderId: userId, status: "pending" });
      }
    },

    async findRequestById(id: string) {
      if (isConnected) {
        return await FriendRequestMongoose.findById(id);
      } else {
        return friendRequestStore.findById(id);
      }
    },

    async updateRequestStatus(id: string, status: "accepted" | "rejected") {
      if (isConnected) {
        const req = await FriendRequestMongoose.findByIdAndUpdate(id, { $set: { status } }, { new: true });
        if (req && status === "accepted") {
          // Push to both users friends arrays
          await UserMongoose.findByIdAndUpdate(req.senderId, { $addToSet: { friends: req.receiverUsername } });
          await UserMongoose.findByIdAndUpdate(req.receiverId, { $addToSet: { friends: req.senderUsername } });
        }
        return req;
      } else {
        const req = friendRequestStore.findById(id);
        if (req) {
          req.status = status;
          friendRequestStore.save(req);

          if (status === "accepted") {
            const sender = userStore.findById(req.senderId);
            const receiver = userStore.findById(req.receiverId);
            if (sender) {
              sender.friends = sender.friends || [];
              if (!sender.friends.includes(req.receiverUsername)) sender.friends.push(req.receiverUsername);
              userStore.save(sender);
            }
            if (receiver) {
              receiver.friends = receiver.friends || [];
              if (!receiver.friends.includes(req.senderUsername)) receiver.friends.push(req.senderUsername);
              userStore.save(receiver);
            }
          }
          return req;
        }
        return null;
      }
    },

    async removeFriend(userId: string, targetUsername: string) {
      const user = await this.usersByIdOrUsername(userId);
      const targetUser = await db.users.findByUsername(targetUsername);

      if (!user || !targetUser) return false;

      if (isConnected) {
        await UserMongoose.findByIdAndUpdate(user._id, { $pull: { friends: targetUser.username } });
        await UserMongoose.findByIdAndUpdate(targetUser._id, { $pull: { friends: user.username } });
        return true;
      } else {
        const u = userStore.findById(user._id);
        const tu = userStore.findById(targetUser._id);
        if (u) {
          u.friends = (u.friends || []).filter((f: string) => f !== targetUser.username);
          userStore.save(u);
        }
        if (tu) {
          tu.friends = (tu.friends || []).filter((f: string) => f !== u.username);
          userStore.save(tu);
        }
        return true;
      }
    },

    async usersByIdOrUsername(idOrUsername: string) {
      if (isConnected) {
        if (mongoose.Types.ObjectId.isValid(idOrUsername)) {
          return await UserMongoose.findById(idOrUsername);
        }
        return await UserMongoose.findOne({ username: idOrUsername });
      } else {
        let user = userStore.findById(idOrUsername);
        if (!user) {
          user = userStore.findOne((u) => u.username.toLowerCase() === idOrUsername.toLowerCase());
        }
        return user;
      }
    },

    async findFriendsList(username: string) {
      const user = await db.users.findByUsername(username);
      if (!user) return [];
      const friendsNames = user.friends || [];
      const results = [];
      for (const name of friendsNames) {
        const friendObj = await db.users.findByUsername(name);
        if (friendObj) {
          results.push({
            id: friendObj._id,
            username: friendObj.username,
            name: friendObj.name,
            profilePicture: friendObj.profilePicture,
            bio: friendObj.bio
          });
        }
      }
      return results;
    }
  },

  // --- NOTIFICATION PERSISTENCE ---
  notifications: {
    async create(data: any) {
      if (isConnected) {
        const notification = new NotificationMongoose(data);
        return await notification.save();
      } else {
        const _id = "n_" + Math.random().toString(36).substr(2, 9);
        const newNotif = { _id, createdAt: new Date(), isRead: false, ...data };
        notificationStore.save(newNotif);
        return newNotif;
      }
    },

    async findByUserId(userId: string, limit = 50) {
      if (isConnected) {
        return await NotificationMongoose.find({ recipientId: userId })
          .sort({ createdAt: -1 })
          .limit(limit);
      } else {
        return notificationStore
          .find({ recipientId: userId })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      }
    },

    async markAsRead(id: string) {
      if (isConnected) {
        return await NotificationMongoose.findByIdAndUpdate(id, { $set: { isRead: true } }, { new: true });
      } else {
        const notif = notificationStore.findById(id);
        if (notif) {
          notif.isRead = true;
          notificationStore.save(notif);
          return notif;
        }
        return null;
      }
    },

    async markAllAsRead(userId: string) {
      if (isConnected) {
        return await NotificationMongoose.updateMany({ recipientId: userId, isRead: false }, { $set: { isRead: true } });
      } else {
        const list = notificationStore.find({ recipientId: userId, isRead: false });
        for (const notif of list) {
          notif.isRead = true;
          notificationStore.save(notif);
        }
        return { modifiedCount: list.length };
      }
    },

    async delete(id: string) {
      if (isConnected) {
        return await NotificationMongoose.findByIdAndDelete(id);
      } else {
        return notificationStore.deleteById(id);
      }
    }
  }
};
