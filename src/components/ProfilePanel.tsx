import React, { useState, useEffect, useRef } from "react";
import {
  Edit2, Globe, Users, Lock, Mail, FileText,
  UserPlus, UserMinus, UserCheck, EyeOff, Check, X, Heart,
  Camera, Loader2, Clock, MessageSquare
} from "lucide-react";
import { User, Post } from "../types";

interface ProfilePanelProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  targetUsername: string;
  onPostLiked: (postId: string, liked: boolean, likes: string[]) => void;
  onViewProfile: (username: string) => void;
  pendingIncomingRequests: any[];
  pendingOutgoingRequests: any[];
  setPendingOutgoingRequests: React.Dispatch<React.SetStateAction<any[]>>;
  fetchConnections: () => void;
}

function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ProfilePanel({
  currentUser, setCurrentUser, targetUsername, onPostLiked, onViewProfile,
  pendingIncomingRequests, pendingOutgoingRequests, setPendingOutgoingRequests, fetchConnections
}: ProfilePanelProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profileFriends, setProfileFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [privacyState, setPrivacyState] = useState<string>("public");
  const [activeSubTab, setActiveSubTab] = useState<"posts" | "friends">("posts");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editProfilePic, setEditProfilePic] = useState("");
  const [editCoverPic, setEditCoverPic] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"public" | "friends" | "private">("public");
  const [isUpdating, setIsUpdating] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem("token");
  const isMe = targetUsername.toLowerCase() === currentUser.username.toLowerCase();

  useEffect(() => { loadProfile(); }, [targetUsername]);

  const loadProfile = async () => {
    setLoading(true); setErrorHeader(null);
    try {
      const res = await fetch(`/api/users/profile/${encodeURIComponent(targetUsername)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setErrorHeader(data.error); setProfileData(data.user);
          setPrivacyState(data.privacy || "private");
          setProfilePosts([]); setProfileFriends([]);
        } else throw new Error(data.error || "Failed to load profile.");
      } else {
        setProfileData(data.profile); setPrivacyState(data.profile.privacy);
        const postsRes = await fetch("/api/posts/feed", { headers: { Authorization: `Bearer ${token}` } });
        const postsData = await postsRes.json();
        if (postsRes.ok && postsData.feed) {
          setProfilePosts(postsData.feed.filter((p: Post) => p.username.toLowerCase() === targetUsername.toLowerCase()));
        }
        const friendsRes = await fetch(`/api/friends/list/${encodeURIComponent(targetUsername)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const friendsData = await friendsRes.json();
        if (friendsRes.ok) setProfileFriends(friendsData.friends || []);
      }
    } catch (err: any) { setErrorHeader(err.message); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "profile" | "cover") => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    const base64 = await new Promise<string>(resolve => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); });
    try {
      const uploadRes = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileData: base64, fileName: file.name, fileType: file.type })
      });
      const uploadData = await uploadRes.json();
      if (uploadRes.ok && uploadData.url) {
        if (field === "profile") setEditProfilePic(uploadData.url);
        else setEditCoverPic(uploadData.url);
      }
    } catch (err) { console.error(err); }
  };

  const openEditDialog = () => {
    if (!profileData) return;
    setEditName(profileData.name || ""); setEditBio(profileData.bio || "");
    setEditProfilePic(profileData.profilePicture || ""); setEditCoverPic(profileData.coverPhoto || "");
    setEditPrivacy(profileData.privacy || "public"); setIsEditModalOpen(true);
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsUpdating(true);
    try {
      const res = await fetch("/api/users/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, bio: editBio, profilePicture: editProfilePic, coverPhoto: editCoverPic, privacy: editPrivacy })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user); localStorage.setItem("currentUser", JSON.stringify(data.user));
        setProfileData((prev: any) => ({ ...prev, name: data.user.name, bio: data.user.bio, profilePicture: data.user.profilePicture, coverPhoto: data.user.coverPhoto, privacy: data.user.privacy }));
        setPrivacyState(data.user.privacy); setIsEditModalOpen(false); fetchConnections();
      }
    } catch (err) { console.error(err); }
    finally { setIsUpdating(false); }
  };

  const handleSendFriendRequest = async () => {
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUsername })
      });
      const data = await res.json();
      if (res.ok) { setPendingOutgoingRequests(prev => [...prev, data.request]); fetchConnections(); }
      else alert(data.error || "Request failed");
    } catch (err) { console.error(err); }
  };

  const handleRemoveFriendship = async () => {
    if (!profileData) return;
    if (!confirm(`Remove ${profileData.name} from your connections?`)) return;
    try {
      const res = await fetch(`/api/friends/remove/${encodeURIComponent(targetUsername)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setProfileData((prev: any) => ({ ...prev, friendsCount: Math.max(0, (prev.friendsCount || 1) - 1), friends: (prev.friends || []).filter((f: string) => f !== currentUser.username) }));
        setProfileFriends(prev => prev.filter(f => f.username !== currentUser.username)); fetchConnections();
      }
    } catch (err) { console.error(err); }
  };

  const renderRelationshipButton = () => {
    if (isMe) return (
      <button onClick={openEditDialog} className="btn btn-secondary" style={{ gap: "6px" }}>
        <Edit2 className="w-4 h-4" /> Edit Profile
      </button>
    );
    if (!profileData) return null;
    const isAlreadyFriend = profileData.friends?.includes(currentUser.username);
    if (isAlreadyFriend) return (
      <button onClick={handleRemoveFriendship} className="btn btn-danger" style={{ gap: "6px" }}>
        <UserMinus className="w-4 h-4" /> Disconnect
      </button>
    );
    const hasSentRequest = pendingOutgoingRequests.some(r => r.receiverUsername.toLowerCase() === targetUsername.toLowerCase() && r.status === "pending");
    if (hasSentRequest) return (
      <button disabled className="btn btn-secondary" style={{ gap: "6px", opacity: 0.6 }}>
        <UserCheck className="w-4 h-4" style={{ color: "var(--primary)" }} /> Request Sent
      </button>
    );
    const hasIncomingRequest = pendingIncomingRequests.some(r => r.senderUsername.toLowerCase() === targetUsername.toLowerCase() && r.status === "pending");
    if (hasIncomingRequest) return (
      <p style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>
        Check Connections to accept their invite.
      </p>
    );
    return (
      <button onClick={handleSendFriendRequest} className="btn btn-primary" style={{ gap: "6px" }}>
        <UserPlus className="w-4 h-4" /> Connect
      </button>
    );
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ minHeight: "60vh" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "var(--primary-dim)", borderTopColor: "var(--primary)" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading profile...</p>
      </div>
    </div>
  );

  const privacyIconColor: Record<string, string> = { public: "var(--accent)", friends: "var(--accent-green)", private: "var(--text-muted)" };

  return (
    <section
      id="profile-pane"
      aria-label={`${profileData?.name || targetUsername}'s profile on ConnectSphere`}
      className="flex-1 max-w-3xl mx-auto py-6 px-3 md:px-4 flex flex-col gap-5 pb-24 md:pb-6 animate-fadeUp"
    >

      {/* ── Cover & Avatar Hero ── */}
      <div className="card overflow-hidden" style={{ padding: 0 }}>
        {/* Cover photo */}
        <div className="relative" style={{ height: "180px", overflow: "hidden" }}>
          {profileData?.coverPhoto ? (
            <img
              src={profileData.coverPhoto}
              alt={`${profileData?.name}'s cover photo on ConnectSphere`}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(34,211,238,0.15) 50%, rgba(236,72,153,0.1) 100%)",
              }}
            />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(8,14,26,0.8) 100%)" }} />
        </div>

        {/* Profile info overlay */}
        <div className="px-5 pb-5" style={{ marginTop: "-60px", position: "relative", zIndex: 10 }}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profileData?.profilePicture ? (
                <img
                  src={profileData.profilePicture}
                  alt={`${profileData?.name}'s profile picture on ConnectSphere`}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-28 h-28 rounded-2xl object-cover"
                  style={{
                    border: "4px solid var(--bg-base)",
                    boxShadow: "var(--shadow-lg)"
                  }}
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-2xl flex items-center justify-center font-black text-4xl text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--primary))",
                    border: "4px solid var(--bg-base)",
                    boxShadow: "var(--shadow-lg)"
                  }}
                >
                  {profileData?.name?.charAt(0)}
                </div>
              )}
            </div>

            {/* Action button */}
            <div className="sm:mb-1">{renderRelationshipButton()}</div>
          </div>

          {/* Name + details */}
          <div className="mt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}
              >
                {profileData?.name}
              </h1>
              {/* Privacy badge */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                style={{
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                  color: privacyIconColor[privacyState] || "var(--text-muted)",
                }}
              >
                {privacyState === "public" && <Globe className="w-3 h-3" />}
                {privacyState === "friends" && <Users className="w-3 h-3" />}
                {privacyState === "private" && <Lock className="w-3 h-3" />}
                {privacyState}
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
              @{profileData?.username}
            </p>

            {/* Bio */}
            {profileData?.bio ? (
              <p className="mt-3" style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.65", maxWidth: "540px" }}>
                {profileData.bio}
              </p>
            ) : isMe ? (
              <button
                onClick={openEditDialog}
                style={{ color: "var(--primary)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", marginTop: "8px", padding: 0 }}
              >
                + Add a bio
              </button>
            ) : null}

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setActiveSubTab("posts")}
              >
                <span className="font-bold text-lg" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {profilePosts.length}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>Posts</span>
              </div>
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setActiveSubTab("friends")}
              >
                <span className="font-bold text-lg" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {profileFriends.length}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>Friends</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Privacy Block ── */}
      {errorHeader ? (
        <div
          className="card flex flex-col items-center justify-center gap-4 py-14 text-center animate-fadeUp"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--danger-dim)" }}
          >
            <EyeOff className="w-8 h-8" style={{ color: "var(--danger)" }} />
          </div>
          <div>
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>{errorHeader}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", maxWidth: "380px", lineHeight: "1.6" }}>
              This account's content is restricted to approved connections. Send a friend request to view their posts and profile.
            </p>
          </div>
          {!isMe && (
            <button onClick={handleSendFriendRequest} className="btn btn-primary" style={{ gap: "6px", marginTop: "4px" }}>
              <UserPlus className="w-4 h-4" /> Send Connection Request
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tab nav */}
          <div className="tab-switcher">
            <button
              onClick={() => setActiveSubTab("posts")}
              className={`tab-item ${activeSubTab === "posts" ? "active" : ""}`}
              id="profile-tab-posts"
            >
              Posts ({profilePosts.length})
            </button>
            <button
              onClick={() => setActiveSubTab("friends")}
              className={`tab-item ${activeSubTab === "friends" ? "active" : ""}`}
              id="profile-tab-friends"
            >
              Friends ({profileFriends.length})
            </button>
          </div>

          {/* Posts tab */}
          {activeSubTab === "posts" && (
            <div className="flex flex-col gap-4 animate-fadeUp">
              {profilePosts.length === 0 ? (
                <div
                  className="card flex flex-col items-center justify-center gap-4 py-14 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-dim)" }}>
                    <FileText className="w-7 h-7" style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>No posts yet</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      {isMe ? "Share your first post from the feed!" : "This user hasn't posted anything yet."}
                    </p>
                  </div>
                </div>
              ) : (
                profilePosts.map((post, idx) => {
                  const isLikedByMe = post.likes?.includes(currentUser.username);
                  return (
                    <div
                      key={post._id}
                      className="card animate-fadeUp"
                      style={{ padding: "16px", animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {profileData?.profilePicture ? (
                          <img
                            src={profileData.profilePicture}
                            alt={`${profileData?.name}'s profile picture`}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-9 h-9 rounded-full object-cover" style={{ border: "1px solid var(--border)" }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
                            style={{ background: "linear-gradient(135deg, var(--accent), var(--primary))" }}>
                            {profileData?.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{profileData?.name}</p>
                          <div className="flex items-center gap-1" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                            <Clock className="w-3 h-3" />
                            <span>{timeAgo(post.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {post.content && (
                        <p className="mb-3" style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                          {post.content}
                        </p>
                      )}

                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="rounded-xl overflow-hidden mb-3" style={{ background: "#000" }}>
                          {post.type === "video" ? (
                            <video src={post.mediaUrls[0]} controls className="w-full" style={{ maxHeight: "320px", objectFit: "contain" }} />
                          ) : (
                          <img
                            src={post.mediaUrls[0]}
                            alt={`${profileData?.name}'s post photo on ConnectSphere`}
                            className="w-full object-cover"
                            style={{ maxHeight: "320px" }}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-1.5" style={{ color: isLikedByMe ? "#ef4444" : "var(--text-muted)", fontSize: "12px" }}>
                          <Heart className="w-3.5 h-3.5" style={{ fill: isLikedByMe ? "#ef4444" : "none" }} />
                          <span>{post.likes?.length ?? 0} Likes</span>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{post.commentsCount || 0} Replies</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Friends tab */}
          {activeSubTab === "friends" && (
            <div className="animate-fadeUp">
              {profileFriends.length === 0 ? (
                <div className="card flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-dim)" }}>
                    <Users className="w-7 h-7" style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>No connections yet</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      {isMe ? "Start connecting with people from the search bar!" : "This user hasn't connected with anyone yet."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profileFriends.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => onViewProfile(f.username)}
                      className="card flex items-center gap-3 p-3.5 cursor-pointer animate-fadeUp"
                      style={{
                        padding: "14px",
                        animationDelay: `${idx * 50}ms`,
                        transition: "border-color 200ms, transform 150ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-active)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {f.profilePicture ? (
                        <img
                          src={f.profilePicture}
                          alt={`${f.name}'s profile photo on ConnectSphere`}
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-11 h-11 rounded-full object-cover shrink-0" style={{ border: "1px solid var(--border)" }}
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-white"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--primary))" }}>
                          {f.name?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{f.name}</h4>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>@{f.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Edit Profile Modal ── */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit your ConnectSphere profile"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}
        >
          <div
            className="w-full max-w-lg rounded-3xl overflow-hidden animate-scaleIn"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>
                Edit Profile
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="btn-icon p-2">
                <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfileSubmit} className="overflow-y-auto" style={{ maxHeight: "75vh" }}>
              <div className="p-6 flex flex-col gap-5">

                {/* Photo uploaders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Profile pic */}
                  <div>
                    <label className="form-label">Profile Photo</label>
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group"
                      style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
                      onClick={() => avatarFileRef.current?.click()}
                    >
                      <div className="relative shrink-0">
                        {editProfilePic ? (
                          <img src={editProfilePic} alt="" className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--bg-hover)" }}>
                            <Camera className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                        <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Change photo</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>JPG, PNG up to 5MB</p>
                      </div>
                      <input type="file" ref={avatarFileRef} accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "profile")} />
                    </div>
                  </div>

                  {/* Cover photo */}
                  <div>
                    <label className="form-label">Cover Banner</label>
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group"
                      style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
                      onClick={() => coverFileRef.current?.click()}
                    >
                      <div className="relative shrink-0">
                        {editCoverPic ? (
                          <img src={editCoverPic} alt="" className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-hover)" }}>
                            <Camera className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                        <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Change banner</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>Wide image recommended</p>
                      </div>
                      <input type="file" ref={coverFileRef} accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "cover")} />
                    </div>
                  </div>
                </div>

                {/* Display name */}
                <div>
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-base"
                    placeholder="Your name"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="form-label">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    maxLength={160}
                    placeholder="Tell people a bit about yourself..."
                    style={{
                      width: "100%",
                      background: "var(--bg-muted)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      padding: "11px 14px",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "'Inter', sans-serif",
                      transition: "border-color 200ms, box-shadow 200ms",
                      lineHeight: "1.5",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px var(--primary-dim)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                  <p style={{ color: "var(--text-faint)", fontSize: "11px", textAlign: "right", marginTop: "4px" }}>
                    {editBio.length}/160
                  </p>
                </div>

                {/* Privacy */}
                <div>
                  <label className="form-label">Profile Privacy</label>
                  <select
                    value={editPrivacy}
                    onChange={(e: any) => setEditPrivacy(e.target.value)}
                    className="input-base"
                  >
                    <option value="public">🌐 Public — Visible to everyone</option>
                    <option value="friends">👥 Friends Only — Approved connections only</option>
                    <option value="private">🔒 Private — Only you can view</option>
                  </select>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary w-full"
                  style={{ padding: "13px", fontSize: "14px", fontWeight: 700, borderRadius: "var(--radius-lg)", marginTop: "4px" }}
                >
                  {isUpdating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving changes...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
