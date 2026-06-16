export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  bio: string;
  profilePicture: string;
  coverPhoto: string;
  friendsCount?: number;
  friends: string[];
  privacy: "public" | "friends" | "private";
}

export interface Post {
  _id: string; // From Mongoose/LocalStore
  userId: string;
  username: string;
  userDisplayName: string;
  userProfilePic: string;
  content: string;
  type: "text" | "image" | "video";
  mediaUrls: string[];
  likes: string[]; // Active usernames who clicked like
  commentsCount: number;
  privacy: "public" | "friends" | "private";
  createdAt: string | Date;
}

export interface Comment {
  _id: string;
  postId: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userProfilePic: string;
  content: string;
  createdAt: string | Date;
}

export interface FriendRequest {
  _id: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  senderProfilePic: string;
  receiverId: string;
  receiverUsername: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string | Date;
}

export interface Notification {
  _id: string;
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  senderProfilePic: string;
  type: "like" | "comment" | "friend_request" | "friend_accept";
  postId?: string;
  isRead: boolean;
  createdAt: string | Date;
}
