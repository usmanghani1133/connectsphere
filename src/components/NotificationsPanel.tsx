import React from "react";
import {
  Heart, MessageSquare, UserPlus, UserCheck, Bell, Trash2,
  CheckSquare, Clock, ShieldAlert
} from "lucide-react";
import { Notification } from "../types";

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (id: string) => void;
  onViewProfile: (username: string) => void;
  onViewPost: (postId: string) => void;
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

function NotifIcon({ type }: { type: string }) {
  const styles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    like: {
      bg: "rgba(239,68,68,0.12)",
      color: "#f87171",
      icon: <Heart className="w-3.5 h-3.5" style={{ fill: "#f87171" }} />,
    },
    comment: {
      bg: "rgba(99,102,241,0.12)",
      color: "#a5b4fc",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    friend_request: {
      bg: "rgba(34,197,94,0.12)",
      color: "#86efac",
      icon: <UserPlus className="w-3.5 h-3.5" />,
    },
    friend_accept: {
      bg: "rgba(34,211,238,0.12)",
      color: "#67e8f9",
      icon: <UserCheck className="w-3.5 h-3.5" />,
    },
  };
  const s = styles[type] || { bg: "rgba(99,102,241,0.08)", color: "var(--text-muted)", icon: <ShieldAlert className="w-3.5 h-3.5" /> };
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}25` }}
    >
      {s.icon}
    </div>
  );
}

function NotifText({ notif, onViewProfile }: { notif: Notification; onViewProfile: (u: string) => void }) {
  const messages: Record<string, string> = {
    like: "liked your post.",
    comment: "replied to your post.",
    friend_request: "sent you a connection request.",
    friend_accept: "accepted your connection request.",
  };
  return (
    <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.5" }}>
      <button
        onClick={() => onViewProfile(notif.senderUsername)}
        style={{
          color: "var(--text-primary)", fontWeight: 600, background: "none",
          border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--accent)")}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
      >
        {notif.senderName}
      </button>
      {" "}
      {messages[notif.type] || "interacted with you."}
    </p>
  );
}

export default function NotificationsPanel({
  notifications, onMarkRead, onMarkAllRead, onDeleteNotification, onViewProfile, onViewPost
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div id="notifications-pane" className="flex-1 max-w-2xl mx-auto py-6 px-3 md:px-4 flex flex-col gap-5 pb-24 md:pb-6 animate-fadeUp">

      {/* ── Header ── */}
      <div
        className="card flex items-center justify-between"
        style={{ padding: "20px 24px" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2
              className="text-xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}
            >
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="badge" style={{ fontSize: "11px", padding: "2px 8px" }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Stay updated on likes, replies, and connections.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="btn btn-secondary"
            style={{ padding: "8px 14px", fontSize: "12px", gap: "6px" }}
          >
            <CheckSquare className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
            Mark all read
          </button>
        )}
      </div>

      {/* ── List ── */}
      <div className="flex flex-col gap-2">
        {notifications.length === 0 ? (
          <div
            className="card flex flex-col items-center justify-center gap-4 py-16 text-center animate-fadeUp"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--primary-dim)" }}
            >
              <Bell
                className="w-8 h-8"
                style={{ color: "var(--primary)", animation: "blobFloat 3s ease-in-out infinite" }}
              />
            </div>
            <div>
              <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>
                All caught up!
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.6", maxWidth: "300px" }}>
                When someone likes your post, replies, or connects with you, it'll show up here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Unread section */}
            {notifications.some(n => !n.isRead) && (
              <p className="section-label px-1 mb-1">Unread</p>
            )}

            {notifications.map((notif, idx) => (
              <div
                key={notif._id}
                className={`animate-fadeUp ${notif.isRead ? "notif-read" : "notif-unread"}`}
                style={{
                  borderRadius: "var(--radius-xl)",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "opacity 200ms, transform 200ms",
                  animationDelay: `${Math.min(idx * 40, 200)}ms`,
                }}
              >
                {/* Icons */}
                <div className="flex items-center gap-2 shrink-0">
                  <NotifIcon type={notif.type} />
                  {notif.senderProfilePic ? (
                    <img
                      src={notif.senderProfilePic}
                      alt={notif.senderName}
                      onClick={() => onViewProfile(notif.senderUsername)}
                      className="w-9 h-9 rounded-full object-cover cursor-pointer transition-transform hover:scale-105"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  ) : (
                    <div
                      onClick={() => onViewProfile(notif.senderUsername)}
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white cursor-pointer transition-transform hover:scale-105"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--primary))" }}
                    >
                      {notif.senderName?.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <NotifText notif={notif} onViewProfile={onViewProfile} />
                  <div className="flex items-center gap-1 mt-1" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo(notif.createdAt)}</span>
                    {!notif.isRead && (
                      <>
                        <span className="mx-1">·</span>
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: "var(--primary)", boxShadow: "0 0 4px var(--primary)" }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!notif.isRead && (
                    <button
                      onClick={() => onMarkRead(notif._id)}
                      title="Mark as read"
                      className="btn"
                      style={{
                        padding: "5px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--primary-dim)",
                        color: "#a5b4fc",
                        border: "1px solid var(--border-active)",
                        borderRadius: "var(--radius-md)",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary-dim)")}
                    >
                      Mark read
                    </button>
                  )}

                  {notif.postId && (notif.type === "like" || notif.type === "comment") && (
                    <button
                      onClick={() => onViewPost(notif.postId!)}
                      className="btn"
                      style={{
                        padding: "5px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--bg-muted)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-hover)";
                        e.currentTarget.style.color = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--bg-muted)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      View post
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteNotification(notif._id)}
                    title="Delete"
                    className="btn-icon p-1.5"
                    style={{ borderRadius: "var(--radius-md)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--danger-dim)";
                      (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--danger)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--text-faint)";
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 transition-colors" style={{ color: "var(--text-faint)" }} />
                  </button>
                </div>
              </div>
            ))}

            {/* Read divider */}
            {notifications.some(n => n.isRead) && notifications.some(n => !n.isRead) && (
              <div className="flex items-center gap-3 my-2 px-1">
                <div className="divider flex-1" />
                <span className="section-label">Earlier</span>
                <div className="divider flex-1" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
