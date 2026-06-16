import React from "react";
import { Rss, User, Users, Bell, Radio } from "lucide-react";
import { User as UserType } from "../types";

interface SidebarProps {
  currentUser: UserType;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setProfileUsername: (username: string) => void;
  unreadCount: number;
  pendingRequestsCount: number;
  onlineUserIds: string[];
  friendsList: any[];
}

export default function Sidebar({
  currentUser,
  activeTab,
  setActiveTab,
  setProfileUsername,
  unreadCount,
  pendingRequestsCount,
  onlineUserIds,
  friendsList
}: SidebarProps) {
  const menuItems = [
    {
      id: "feed",
      label: "Feed",
      icon: Rss,
      badge: 0,
      color: "#a5b4fc"
    },
    {
      id: "profile",
      label: "My Profile",
      icon: User,
      badge: 0,
      color: "#22d3ee",
      action: () => setProfileUsername(currentUser.username)
    },
    {
      id: "friends",
      label: "Connections",
      icon: Users,
      badge: pendingRequestsCount,
      color: "#86efac"
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadCount,
      color: "#f9a8d4"
    }
  ];

  const onlineFriends = friendsList.filter(f => onlineUserIds.includes(f.id));
  const offlineFriends = friendsList.filter(f => !onlineUserIds.includes(f.id));

  const handleTabClick = (item: any) => {
    if (item.action) item.action();
    setActiveTab(item.id);
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        id="sidebar-panel"
        role="complementary"
        aria-label="Navigation and friends list"
        className="hidden md:flex flex-col gap-5 shrink-0 p-4 overflow-y-auto"
        style={{
          width: "240px",
          minHeight: "calc(100vh - 64px)",
          position: "sticky",
          top: "64px",
          height: "calc(100vh - 64px)",
          background: "var(--bg-base)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* User card */}
        <button
          onClick={() => { setProfileUsername(currentUser.username); setActiveTab("profile"); }}
          className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left animate-fadeUp"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-active)";
            e.currentTarget.style.background = "var(--bg-elevated)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "var(--bg-surface)";
          }}
          id="sidebar-user-card"
        >
          <div className="relative shrink-0">
            {currentUser.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={`${currentUser.name}'s profile picture on ConnectSphere`}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover"
                style={{ border: "2px solid var(--primary)" }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{
                  background: "linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)"
                }}
              >
                {currentUser.name.charAt(0)}
              </div>
            )}
            {/* Online indicator */}
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
              style={{
                background: "var(--accent-green)",
                border: "2px solid var(--bg-base)",
                boxShadow: "0 0 6px rgba(34,197,94,0.5)"
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
              {currentUser.name}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              @{currentUser.username}
            </p>
          </div>
        </button>

        {/* Navigation */}
        <nav aria-label="Main site navigation">
          <p className="section-label px-3 mb-2">Navigation</p>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleTabClick(item)}
                className="nav-item animate-slideInLeft"
                aria-current={isActive ? "page" : undefined}
                aria-label={`${item.label}${item.badge > 0 ? `, ${item.badge} new` : ""}`}
                style={{
                  animationDelay: `${i * 60}ms`,
                  ...(isActive ? {
                    background: "linear-gradient(135deg, var(--primary-dim), rgba(99,102,241,0.06))",
                    color: "#a5b4fc",
                    borderColor: "var(--border-active)",
                    fontWeight: 600,
                    boxShadow: "inset 3px 0 0 var(--primary)"
                  } : {})
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className="w-4.5 h-4.5 shrink-0"
                    style={{ color: isActive ? item.color : "var(--text-muted)" }}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`badge ${item.id === "friends" ? "badge-danger" : ""}`}>
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Friends presence */}
        <div
          className="flex flex-col gap-3 rounded-2xl p-3 mt-auto animate-fadeUp"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            animationDelay: "300ms"
          }}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: "var(--accent-green)" }} />
            <span className="section-label">
              Online ({onlineFriends.length})
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {friendsList.length === 0 ? (
              <p className="text-xs italic" style={{ color: "var(--text-faint)" }}>
                No connections yet. Search for people!
              </p>
            ) : (
              [...onlineFriends, ...offlineFriends].map((friend) => {
                const isOnline = onlineUserIds.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    onClick={() => { setProfileUsername(friend.username); setActiveTab("profile"); }}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl transition-all w-full text-left"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="relative shrink-0">
                      {friend.profilePicture ? (
                        <img
                          src={friend.profilePicture}
                          alt={friend.name}
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover"
                          style={{ border: "1px solid var(--border)" }}
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                          style={{ background: "var(--bg-muted)" }}
                        >
                          {friend.name?.charAt(0)}
                        </div>
                      )}
                      <span
                        className="absolute -bottom-0.5 -right-0.5"
                        style={isOnline ? {
                          width: "8px", height: "8px", borderRadius: "50%",
                          background: "var(--accent-green)",
                          border: "2px solid var(--bg-base)",
                          boxShadow: "0 0 4px rgba(34,197,94,0.6)"
                        } : {
                          width: "8px", height: "8px", borderRadius: "50%",
                          background: "var(--text-faint)",
                          border: "2px solid var(--bg-base)"
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: isOnline ? "var(--text-primary)" : "var(--text-secondary)" }}
                      >
                        {friend.name}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-faint)" }}>
                        {isOnline ? "Active now" : "Offline"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{
          background: "rgba(8,14,26,0.92)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border)",
        }}
        id="mobile-bottom-nav"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item)}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all"
              style={{
                background: isActive ? "var(--primary-dim)" : "transparent",
                border: "none",
                cursor: "pointer",
                minWidth: "56px",
              }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isActive ? "#a5b4fc" : "var(--text-muted)" }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#a5b4fc" : "var(--text-muted)",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {item.label}
              </span>
              {item.badge > 0 && (
                <span
                  className="absolute top-1 right-2"
                  style={{
                    background: item.id === "friends" ? "var(--danger)" : "var(--primary)",
                    color: "#fff",
                    fontSize: "9px",
                    fontWeight: 700,
                    borderRadius: "999px",
                    minWidth: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
