import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

// Components
import Navbar from "./components/Navbar.tsx";
import Sidebar from "./components/Sidebar.tsx";
import AuthPanel from "./components/AuthPanel.tsx";
import FeedPanel from "./components/FeedPanel.tsx";
import ProfilePanel from "./components/ProfilePanel.tsx";
import NotificationsPanel from "./components/NotificationsPanel.tsx";
import FriendsPanel from "./components/FriendsPanel.tsx";

// SEO
import { useSEO } from "./hooks/useSEO";

// Types
import { User, Post, Comment, Notification, FriendRequest } from "./types";

// ── Simple animated page wrapper ──────────────────────────────────────
function PageTransition({ children, tabKey }: { children: React.ReactNode; tabKey: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(t);
  }, [tabKey]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 280ms cubic-bezier(0.4,0,0.2,1), transform 280ms cubic-bezier(0.4,0,0.2,1)",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// ── Toast notification system ────────────────────────────────────────
interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "error";
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const colorMap = {
          success: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", color: "#86efac" },
          info:    { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", color: "#a5b4fc" },
          error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  color: "#fca5a5" },
        };
        const c = colorMap[t.type];
        return (
          <div
            key={t.id}
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.color,
              borderRadius: "14px",
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              pointerEvents: "auto",
              cursor: "pointer",
              animation: "slideDown 250ms cubic-bezier(0.4,0,0.2,1) both",
              minWidth: "240px",
              maxWidth: "360px",
            }}
            onClick={() => onDismiss(t.id)}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [profileUsername, setProfileUsername] = useState<string>("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast helper
  const showToast = (message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // Session validation
  useEffect(() => {
    if (token) validateSession();
  }, [token]);

  const validateSession = async () => {
    try {
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setProfileUsername(data.user.username);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("Session verification error:", err);
      handleLogout();
    }
  };

  const handleAuthSuccess = (newToken: string, user: User) => {
    setToken(newToken);
    setCurrentUser(user);
    setProfileUsername(user.username);
    setActiveTab("feed");
    showToast(`Welcome back, ${user.name.split(" ")[0]}! 👋`, "success");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    setToken(null);
    setCurrentUser(null);
    if (socket) socket.disconnect();
    setSocket(null);
  };

  // WebSocket setup
  useEffect(() => {
    if (!currentUser || !token) return;

    const newSocket = io(window.location.origin, { transports: ["websocket", "polling"] });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("WebSocket connected.");
      newSocket.emit("register_user", currentUser.id);
    });

    newSocket.on("user_status_change", (data: { userId: string; status: "online" | "offline" }) => {
      setOnlineUserIds(prev => {
        if (data.status === "online") return prev.includes(data.userId) ? prev : [...prev, data.userId];
        return prev.filter(id => id !== data.userId);
      });
    });

    newSocket.on("new_feed_post", (post: Post) => {
      setPosts(prev => {
        if (prev.some(p => p._id === post._id)) return prev;
        return [post, ...prev];
      });
    });

    newSocket.on("post_modified", (updated: Post) => {
      setPosts(prev => prev.map(p => p._id === updated._id ? updated : p));
    });

    newSocket.on("post_deleted", (data: { postId: string }) => {
      setPosts(prev => prev.filter(p => p._id !== data.postId));
    });

    newSocket.on("post_like_changed", (data: { postId: string; likes: string[] }) => {
      setPosts(prev => prev.map(p => p._id === data.postId ? { ...p, likes: data.likes } : p));
    });

    newSocket.on("new_friend_request", (req: FriendRequest) => {
      setIncomingRequests(prev => {
        if (prev.some(r => r._id === req._id)) return prev;
        return [req, ...prev];
      });
      showToast(`${req.senderName} sent you a connection request!`, "info");
    });

    newSocket.on("friend_request_accepted", (data: { requestId: string; newFriend: any }) => {
      setOutgoingRequests(prev => prev.filter(r => r._id !== data.requestId));
      setFriendsList(prev => {
        if (prev.some(f => f.username === data.newFriend.username)) return prev;
        return [...prev, data.newFriend];
      });
      showToast(`${data.newFriend.name} accepted your request! 🎉`, "success");
    });

    newSocket.on("friend_removed", (data: { friendUsername: string }) => {
      setFriendsList(prev => prev.filter(f => f.username !== data.friendUsername));
    });

    newSocket.on("new_notification", (notif: Notification) => {
      setNotifications(prev => {
        if (prev.some(n => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
    });

    return () => { newSocket.disconnect(); };
  }, [currentUser, token]);

  // Load initial data
  useEffect(() => {
    if (currentUser && token) {
      fetchFeed();
      fetchConnections();
      fetchNotifications();
    }
  }, [currentUser, token]);

  const fetchFeed = async () => {
    try {
      const res = await fetch("/api/posts/feed", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.feed) setPosts(data.feed);
    } catch (err) { console.error("Error fetching feed:", err); }
  };

  const fetchConnections = async () => {
    if (!currentUser) return;
    try {
      const reqRes = await fetch("/api/friends/requests", { headers: { Authorization: `Bearer ${token}` } });
      const reqData = await reqRes.json();
      if (reqRes.ok) {
        setIncomingRequests(reqData.incoming || []);
        setOutgoingRequests(reqData.outgoing || []);
      }
      const listRes = await fetch(`/api/friends/list/${encodeURIComponent(currentUser.username)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listData = await listRes.json();
      if (listRes.ok) setFriendsList(listData.friends || []);
    } catch (err) { console.error("Error fetching connections:", err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.notifications) setNotifications(data.notifications);
    } catch (err) { console.error("Error fetching notifications:", err); }
  };

  // Handlers
  const handleLikePostInList = (postId: string, liked: boolean, likes: string[]) => {
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes } : p));
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error(err); }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) { console.error(err); }
  };

  const handleAcceptInvite = async (reqId: string) => {
    try {
      const res = await fetch(`/api/friends/requests/${reqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "accepted" })
      });
      if (res.ok) fetchConnections();
    } catch (err) { console.error(err); }
  };

  const handleRejectInvite = async (reqId: string) => {
    try {
      const res = await fetch(`/api/friends/requests/${reqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "rejected" })
      });
      if (res.ok) setIncomingRequests(prev => prev.filter(r => r._id !== reqId));
    } catch (err) { console.error(err); }
  };

  const handleUnfriendUser = async (friendUsername: string) => {
    try {
      const res = await fetch(`/api/friends/remove/${encodeURIComponent(friendUsername)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFriendsList(prev => prev.filter(f => f.username !== friendUsername));
        fetchConnections();
      }
    } catch (err) { console.error(err); }
  };

  const handleViewPostDetails = (postId: string) => {
    setActiveTab("feed");
    setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  const handleViewUserProfile = (username: string) => {
    setProfileUsername(username);
    setActiveTab("profile");
  };

  // ── Dynamic SEO per active tab ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useSEO(token && currentUser ? activeTab : "auth", currentUser?.name);

  // ── Auth gate ──
  if (!token || !currentUser) {
    return <AuthPanel onAuthSuccess={handleAuthSuccess} />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div
      id="connect-sphere-application"
      role="application"
      aria-label="ConnectSphere Social Platform"
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        fontFamily: "'Inter', sans-serif",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Skip to main content — keyboard accessibility */}
      <a
        href="#main-content"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          zIndex: 99999,
          background: "var(--primary)",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: "0 0 8px 0",
          fontWeight: 700,
          fontSize: "14px",
          textDecoration: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.left = "0"; e.currentTarget.style.width = "auto"; e.currentTarget.style.height = "auto"; }}
        onBlur={(e) => { e.currentTarget.style.left = "-9999px"; e.currentTarget.style.width = "1px"; e.currentTarget.style.height = "1px"; }}
      >
        Skip to main content
      </a>
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setProfileUsername={setProfileUsername}
        unreadCount={unreadCount}
      />

      {/* Main layout wrapper */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "row",
        }}
        role="region"
        aria-label="Application content"
      >
        {/* Sidebar */}
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setProfileUsername={setProfileUsername}
          unreadCount={unreadCount}
          pendingRequestsCount={incomingRequests.length}
          onlineUserIds={onlineUserIds}
          friendsList={friendsList}
        />

        {/* Main content */}
        <main
          id="main-content"
          aria-label={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} — ConnectSphere`}
          tabIndex={-1}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: "calc(100vh - 64px)",
            position: "relative",
            outline: "none",
          }}
        >
          {activeTab === "feed" && (
            <PageTransition tabKey="feed">
              <FeedPanel
                currentUser={currentUser}
                posts={posts}
                setPosts={setPosts}
                onViewProfile={handleViewUserProfile}
                onPostLiked={handleLikePostInList}
              />
            </PageTransition>
          )}

          {activeTab === "profile" && (
            <PageTransition tabKey={`profile-${profileUsername}`}>
              <ProfilePanel
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                targetUsername={profileUsername || currentUser.username}
                onPostLiked={handleLikePostInList}
                onViewProfile={handleViewUserProfile}
                pendingIncomingRequests={incomingRequests}
                pendingOutgoingRequests={outgoingRequests}
                setPendingOutgoingRequests={setOutgoingRequests}
                fetchConnections={fetchConnections}
              />
            </PageTransition>
          )}

          {activeTab === "friends" && (
            <PageTransition tabKey="friends">
              <FriendsPanel
                currentUser={currentUser}
                incomingRequests={incomingRequests}
                outgoingRequests={outgoingRequests}
                friendsList={friendsList}
                onAcceptRequest={handleAcceptInvite}
                onRejectRequest={handleRejectInvite}
                onRemoveFriend={handleUnfriendUser}
                onViewProfile={handleViewUserProfile}
              />
            </PageTransition>
          )}

          {activeTab === "notifications" && (
            <PageTransition tabKey="notifications">
              <NotificationsPanel
                notifications={notifications}
                onMarkRead={handleMarkNotifRead}
                onMarkAllRead={handleMarkAllNotifsRead}
                onDeleteNotification={handleDeleteNotif}
                onViewProfile={handleViewUserProfile}
                onViewPost={handleViewPostDetails}
              />
            </PageTransition>
          )}
        </main>
      </div>
    </div>
  );
}
