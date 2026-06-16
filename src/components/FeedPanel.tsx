import React, { useState, useEffect, useRef } from "react";
import {
  Heart, MessageSquare, Clock, Globe, Users, Lock, Send, Image as ImageIcon,
  Video as VideoIcon, Trash2, Edit2, Check, X, MoreHorizontal, Sparkles,
  Loader2
} from "lucide-react";
import { User, Post, Comment } from "../types";

interface FeedPanelProps {
  currentUser: User;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onViewProfile: (username: string) => void;
  onPostLiked: (postId: string, liked: boolean, likes: string[]) => void;
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

function PrivacyBadge({ privacy }: { privacy: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    public:  { icon: <Globe className="w-3 h-3" />,  label: "Public",  color: "var(--accent)" },
    friends: { icon: <Users className="w-3 h-3" />, label: "Friends", color: "var(--accent-green)" },
    private: { icon: <Lock className="w-3 h-3" />,  label: "Private", color: "var(--text-muted)" },
  };
  const { icon, color } = map[privacy] || map.public;
  return (
    <span className="inline-flex items-center gap-1" style={{ color, opacity: 0.8 }}>
      {icon}
    </span>
  );
}

function SkeletonPost() {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-2 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="skeleton h-48 w-full rounded-xl" />
      <div className="flex gap-4">
        <div className="skeleton h-7 w-16 rounded-lg" />
        <div className="skeleton h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export default function FeedPanel({
  currentUser, posts, setPosts, onViewProfile, onPostLiked
}: FeedPanelProps) {
  const [newContent, setNewContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("text");
  const [privacy, setPrivacy] = useState<"public" | "friends" | "private">("public");
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [likedAnimating, setLikedAnimating] = useState<Record<string, boolean>>({});

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"public" | "friends" | "private">("public");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoadingFeed(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (posts.length > 0) setIsLoadingFeed(false);
  }, [posts]);

  // Close menus on outside click
  useEffect(() => {
    const handler = () => setActiveMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const autoResizeTextarea = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  };

  const toggleComments = async (postId: string) => {
    const isOpen = expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && !commentsMap[postId]) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/comments/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.comments) setCommentsMap(prev => ({ ...prev, [postId]: data.comments }));
      } catch (err) { console.error(err); }
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const token = localStorage.getItem("token");
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(files[i]);
        });
        const uploadRes = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fileData: base64, fileName: files[i].name, fileType: files[i].type })
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) urls.push(uploadData.url);
        else throw new Error(uploadData.error || "Upload failed");
      }
      setMediaUrls(prev => [...prev, ...urls]);
      setMediaType(type);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && mediaUrls.length === 0) return;
    setIsPosting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newContent, type: mediaUrls.length > 0 ? mediaType : "text", mediaUrls, privacy })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");
      setPosts(prev => [data.post, ...prev]);
      setNewContent(""); setMediaUrls([]); setMediaType("text"); setPrivacy("public");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err) { console.error(err); }
    finally { setIsPosting(false); }
  };

  const handleLikeToggle = async (postId: string) => {
    const token = localStorage.getItem("token");
    setLikedAnimating(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => setLikedAnimating(prev => ({ ...prev, [postId]: false })), 400);
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) onPostLiked(postId, data.liked, data.likes);
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/comments/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text })
      });
      const data = await res.json();
      if (res.ok) {
        setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data.comment] }));
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setCommentsMap(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c._id !== commentId) }));
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) } : p));
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdatePost = async (postId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent, privacy: editPrivacy })
      });
      const data = await res.json();
      if (res.ok) { setPosts(prev => prev.map(p => p._id === postId ? data.post : p)); setEditingPostId(null); }
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setPosts(prev => prev.filter(p => p._id !== postId)); setActiveMenuId(null); }
    } catch (err) { console.error(err); }
  };

  return (
    <section
      id="feed-pane"
      aria-label="Social feed"
      className="flex-1 max-w-2xl mx-auto py-6 px-3 md:px-4 flex flex-col gap-5 pb-24 md:pb-6"
    >
      {/* Visually hidden page heading for screen readers */}
      <h1 className="sr-only">ConnectSphere Feed — Share and discover posts from your campus network</h1>

      {/* ── Create Post ── */}
      <div
        className="animate-fadeUp"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          padding: "16px",
          transition: "border-color 200ms",
        }}
        onFocusCapture={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-active)";
        }}
        onBlurCapture={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        }}
      >
        <form onSubmit={handleCreatePost} aria-label="Create a new post">
          <div className="flex gap-3 mb-3">
            {currentUser.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={`${currentUser.name}'s profile picture on ConnectSphere`}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover shrink-0"
                style={{ border: "2px solid var(--primary)" }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-white text-sm"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--primary))" }}
              >
                {currentUser.name.charAt(0)}
              </div>
            )}
            <label htmlFor="post-compose" className="sr-only">
              Write a post — What's on your mind, {currentUser.name.split(" ")[0]}?
            </label>
            <textarea
              ref={textareaRef}
              id="post-compose"
              aria-label={`What's on your mind, ${currentUser.name.split(" ")[0]}? Write a new post`}
              placeholder={`What's on your mind, ${currentUser.name.split(" ")[0]}?`}
              value={newContent}
              onChange={(e) => { setNewContent(e.target.value); autoResizeTextarea(); }}
              rows={2}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif",
                lineHeight: "1.6",
                minHeight: "56px",
                paddingTop: "4px",
              }}
            />
          </div>

          {/* Media preview */}
          {mediaUrls.length > 0 && (
            <div
              className="relative mb-3 rounded-xl overflow-hidden"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            >
              <button
                type="button"
                onClick={() => { setMediaUrls([]); setMediaType("text"); }}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }}
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
              <div className={`grid gap-1 ${mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {mediaUrls.map((url, idx) => (
                  <div key={idx} className="relative overflow-hidden" style={{ maxHeight: "280px", background: "#000" }}>
                    {mediaType === "video" ? (
                      <video src={url} controls className="w-full max-h-72 object-contain" />
                    ) : (
                      <img src={url} alt="Preview" className="w-full object-cover" style={{ maxHeight: "280px" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Uploading media...</span>
            </div>
          )}

          {/* Toolbar */}
          <div
            className="flex items-center justify-between pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-1">
              <input type="file" accept="image/*" multiple ref={imageInputRef} onChange={(e) => handleMediaSelect(e, "image")} className="hidden" />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-xs font-semibold"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--accent)", fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo</span>
              </button>
              <input type="file" accept="video/*" ref={videoInputRef} onChange={(e) => handleMediaSelect(e, "video")} className="hidden" />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-xs font-semibold"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--accent-pink)", fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(236,72,153,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <VideoIcon className="w-4 h-4" />
                <span>Video</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={privacy}
                onChange={(e: any) => setPrivacy(e.target.value)}
                style={{
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  padding: "6px 28px 6px 10px",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <option value="public">🌐 Public</option>
                <option value="friends">👥 Friends</option>
                <option value="private">🔒 Private</option>
              </select>

              <button
                type="submit"
                disabled={isPosting || isUploading || (!newContent.trim() && mediaUrls.length === 0)}
                className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: "12px", fontWeight: 700, borderRadius: "var(--radius-lg)" }}
              >
                {isPosting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Post</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Feed ── */}
      <section
        aria-label="Posts from your network"
        aria-live="polite"
        aria-atomic="false"
        className="flex flex-col gap-4"
      >
        {isLoadingFeed ? (
          [1, 2, 3].map(i => <SkeletonPost key={i} />)
        ) : posts.length === 0 ? (
          // Empty state
          <div
            className="flex flex-col items-center justify-center gap-4 py-16 animate-fadeUp"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-2xl)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--primary-dim)" }}
            >
              <Sparkles className="w-8 h-8" style={{ color: "var(--primary)" }} />
            </div>
            <div className="text-center px-6">
              <h3 className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>
                Your feed is empty
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.6" }}>
                Share your first update above, or connect with people to see their posts here.
              </p>
            </div>
          </div>
        ) : (
          posts.map((post, idx) => {
            const isLikedByMe = post.likes?.includes(currentUser.username);
            const isMyPost = post.userId === currentUser.id;
            const isEditing = editingPostId === post._id;
            const isExpanded = expandedPosts[post._id];
            const isAnimating = likedAnimating[post._id];
            const TRUNCATE_LEN = 280;
            const isLong = post.content?.length > TRUNCATE_LEN;
            const displayContent = isLong && !isExpanded
              ? post.content.slice(0, TRUNCATE_LEN) + "…"
              : post.content;

            return (
              <article
                key={post._id}
                id={`post-${post._id}`}
                aria-label={`Post by ${post.userDisplayName}`}
                className="card animate-fadeUp"
                style={{
                  padding: "0",
                  animationDelay: `${Math.min(idx * 60, 300)}ms`,
                  overflow: "hidden",
                }}
              >
                {/* Post header */}
                <div className="flex items-start justify-between p-4 pb-3">
                  <div className="flex items-center gap-3">
                    {post.userProfilePic ? (
                      <img
                        src={post.userProfilePic}
                        alt={`${post.userDisplayName}'s profile picture on ConnectSphere`}
                        onClick={() => onViewProfile(post.username)}
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-10 h-10 rounded-full object-cover shrink-0 cursor-pointer transition-transform hover:scale-105"
                        style={{ border: "2px solid var(--border)" }}
                      />
                    ) : (
                      <div
                        onClick={() => onViewProfile(post.username)}
                        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-white cursor-pointer hover:scale-105 transition-transform"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--primary))" }}
                      >
                        {post.userDisplayName?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => onViewProfile(post.username)}
                          className="font-semibold text-sm cursor-pointer transition-colors"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--accent)")}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
                        >
                          {post.userDisplayName}
                        </h4>
                        <PrivacyBadge privacy={post.privacy} />
                      </div>
                      <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                        <span>@{post.username}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Three dot menu */}
                  {isMyPost && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === post._id ? null : post._id); }}
                        className="btn-icon p-1.5 rounded-lg"
                        style={{ borderRadius: "var(--radius-md)" }}
                      >
                        <MoreHorizontal className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      </button>
                      {activeMenuId === post._id && (
                        <div
                          className="absolute top-9 right-0 w-40 p-1.5 rounded-2xl z-20 flex flex-col gap-0.5 animate-scaleIn"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            boxShadow: "var(--shadow-lg)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setEditingPostId(post._id); setEditContent(post.content); setEditPrivacy(post.privacy); setActiveMenuId(null); }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors text-xs font-medium w-full"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                            Edit post
                          </button>
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors text-xs font-medium w-full"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontFamily: "'Inter', sans-serif" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--danger-dim)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete post
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Post body */}
                <div className="px-4 pb-3">
                  {isEditing ? (
                    <div
                      className="rounded-xl p-3 flex flex-col gap-2.5"
                      style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                    >
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          resize: "none",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      />
                      <div className="flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                        <select
                          value={editPrivacy}
                          onChange={(e: any) => setEditPrivacy(e.target.value)}
                          style={{
                            background: "var(--bg-muted)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)", color: "var(--text-secondary)",
                            fontSize: "11px", padding: "4px 24px 4px 8px", cursor: "pointer",
                            outline: "none", fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          <option value="public">🌐 Public</option>
                          <option value="friends">👥 Friends</option>
                          <option value="private">🔒 Private</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPostId(null)}
                            className="btn btn-ghost"
                            style={{ padding: "5px 12px", fontSize: "12px" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdatePost(post._id)}
                            className="btn btn-primary"
                            style={{ padding: "5px 14px", fontSize: "12px" }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.content && (
                        <div>
                          <p style={{ color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.65", whiteSpace: "pre-wrap" }}>
                            {displayContent}
                          </p>
                          {isLong && (
                            <button
                              onClick={() => setExpandedPosts(prev => ({ ...prev, [post._id]: !isExpanded }))}
                              style={{ color: "var(--primary)", fontSize: "12px", fontWeight: 600, background: "none", border: "none", cursor: "pointer", marginTop: "4px" }}
                            >
                              {isExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Media */}
                {!isEditing && post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div style={{ background: "#000", overflow: "hidden", marginBottom: "2px" }}>
                    {post.type === "video" ? (
                      <video
                        src={post.mediaUrls[0]}
                        controls
                        className="w-full"
                        style={{ maxHeight: "400px", objectFit: "contain" }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`grid gap-0.5 ${post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {post.mediaUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Post media"
                            className="w-full object-cover"
                            style={{ maxHeight: post.mediaUrls.length === 1 ? "440px" : "220px" }}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Interaction bar */}
                <div
                  className="flex items-center gap-1 px-4 py-2.5"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {/* Like */}
                  <button
                    onClick={() => handleLikeToggle(post._id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-xs font-semibold"
                    style={{
                      background: isLikedByMe ? "rgba(239,68,68,0.10)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: isLikedByMe ? "#ef4444" : "var(--text-secondary)",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onMouseEnter={(e) => { if (!isLikedByMe) e.currentTarget.style.background = "rgba(239,68,68,0.07)"; }}
                    onMouseLeave={(e) => { if (!isLikedByMe) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Heart
                      className="w-4 h-4 transition-all"
                      style={{
                        color: isLikedByMe ? "#ef4444" : "var(--text-secondary)",
                        fill: isLikedByMe ? "#ef4444" : "none",
                        transform: isAnimating ? "scale(1.3)" : "scale(1)",
                        transition: "transform 200ms var(--ease-spring), fill 150ms, color 150ms",
                      }}
                    />
                    <span>{post.likes?.length ?? 0}</span>
                  </button>

                  {/* Comment */}
                  <button
                    onClick={() => toggleComments(post._id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-xs font-semibold"
                    style={{
                      background: expandedComments[post._id] ? "var(--primary-dim)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: expandedComments[post._id] ? "#a5b4fc" : "var(--text-secondary)",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onMouseEnter={(e) => { if (!expandedComments[post._id]) e.currentTarget.style.background = "var(--bg-muted)"; }}
                    onMouseLeave={(e) => { if (!expandedComments[post._id]) e.currentTarget.style.background = "transparent"; }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentsCount || 0} {post.commentsCount === 1 ? "Reply" : "Replies"}</span>
                  </button>
                </div>

                {/* Comments section */}
                {expandedComments[post._id] && (
                  <div
                    className="px-4 pb-4 pt-2 flex flex-col gap-3 animate-slideDown"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    {/* Comment input */}
                    <div className="flex gap-2.5 items-center">
                      {currentUser.profilePicture ? (
                        <img src={currentUser.profilePicture} alt={currentUser.name} className="w-7 h-7 rounded-full object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
                      ) : (
                        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white" style={{ background: "var(--primary)" }}>
                          {currentUser.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a reply..."
                          value={commentInputs[post._id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment(post._id)}
                          className="input-base"
                          style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "var(--radius-full)" }}
                        />
                        <button
                          onClick={() => handleAddComment(post._id)}
                          disabled={!commentInputs[post._id]?.trim()}
                          className="btn btn-primary"
                          style={{ padding: "8px 12px", borderRadius: "var(--radius-full)", minWidth: "unset" }}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Comments list */}
                    <div className="flex flex-col gap-2">
                      {!commentsMap[post._id] ? (
                        <div className="flex items-center gap-2 py-2 px-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-muted)" }} />
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Loading replies...</span>
                        </div>
                      ) : commentsMap[post._id].length === 0 ? (
                        <p style={{ color: "var(--text-faint)", fontSize: "12px", textAlign: "center", padding: "8px 0", fontStyle: "italic" }}>
                          No replies yet. Start the conversation!
                        </p>
                      ) : (
                        commentsMap[post._id].map((c) => {
                          const canDelete = c.userId === currentUser.id || isMyPost;
                          return (
                            <div
                              key={c._id}
                              className="flex gap-2.5 p-2.5 rounded-xl transition-colors"
                              style={{
                                background: "var(--bg-base)",
                                border: "1px solid var(--border-subtle)",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                            >
                              {c.userProfilePic ? (
                                <img src={c.userProfilePic} alt={c.userDisplayName} className="w-7 h-7 rounded-full object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
                              ) : (
                                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] text-white" style={{ background: "var(--bg-muted)" }}>
                                  {c.userDisplayName?.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold" style={{ color: "var(--text-primary)", fontSize: "12px" }}>{c.userDisplayName}</span>
                                    <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>@{c.username}</span>
                                  </div>
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteComment(post._id, c._id)}
                                      className="p-1 rounded transition-colors opacity-0 hover:opacity-100"
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
                                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                                  {c.content}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}
