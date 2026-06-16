import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, LogOut, Globe, Users, Lock, X } from "lucide-react";
import { User as UserType } from "../types";

interface NavbarProps {
  currentUser: UserType;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setProfileUsername: (username: string) => void;
  unreadCount: number;
}

export default function Navbar({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  setProfileUsername,
  unreadCount
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length === 0) { setSearchResults([]); return; }
    const delay = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch((import.meta.env.VITE_API_URL || "") + `/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.results) setSearchResults(data.results);
      } catch (err) { console.error(err); }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSelectUser = (username: string) => {
    setProfileUsername(username);
    setActiveTab("profile");
    setIsSearching(false);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const getPrivacyIcon = (p: string) => {
    if (p === "friends") return <Users className="w-3 h-3" style={{ color: "var(--accent-green)" }} />;
    if (p === "private") return <Lock className="w-3 h-3" style={{ color: "var(--danger)" }} />;
    return <Globe className="w-3 h-3" style={{ color: "var(--accent)" }} />;
  };

  return (
    <header
      id="app-navbar"
      role="banner"
      aria-label="ConnectSphere main navigation"
      className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(8,14,26,0.85)",
        backdropFilter: "blur(24px) saturate(1.5)",
        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="w-full max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <button
          id="navbar-logo"
          className="flex items-center gap-2.5 shrink-0"
          aria-label="ConnectSphere — go to home feed"
          style={{ background: "none", border: "none", cursor: "pointer" }}
          onClick={() => { setActiveTab("feed"); setProfileUsername(""); }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
            aria-hidden="true"
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)",
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
            }}
          >
            CS
          </div>
          <span
            className="font-bold text-base hidden sm:inline"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: "linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ConnectSphere
          </span>
        </button>

        {/* ── Search Bar ── */}
        <div
          ref={searchRef}
          className="relative flex-1 max-w-lg hidden md:block"
          role="search"
          aria-label="Search ConnectSphere users"
        >
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              id="navbar-search"
              type="text"
              placeholder="Search users by name or @username..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
              onFocus={() => setIsSearching(true)}
              style={{
                width: "100%",
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                color: "var(--text-primary)",
                fontSize: "13px",
                padding: "9px 14px 9px 40px",
                outline: "none",
                transition: "border-color 200ms, box-shadow 200ms",
                fontFamily: "'Inter', sans-serif",
              }}
              onFocusCapture={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "var(--primary)";
                (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--primary-dim)";
              }}
              onBlurCapture={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "var(--border)";
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon p-1"
              >
                <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {isSearching && searchQuery.trim().length > 0 && (
            <div
              className="absolute top-12 left-0 right-0 max-h-72 overflow-y-auto rounded-2xl shadow-2xl p-2 z-50 animate-slideDown"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {searchResults.length === 0 ? (
                <div className="p-4 text-center" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  No users found for "{searchQuery}"
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.username)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        style={{ border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white"
                        style={{ background: "var(--primary)" }}
                      >
                        {user.name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--text-primary)", fontSize: "13px" }}>
                        {user.name}
                      </p>
                      <p className="truncate" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                        @{user.username}
                      </p>
                    </div>
                    <div className="shrink-0">{getPrivacyIcon(user.privacy)}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Mobile search toggle */}
          <button
            className="btn-icon md:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
            id="navbar-search-toggle"
          >
            <Search className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </button>

          {/* Notification Bell */}
          <button
            id="navbar-notifications"
            onClick={() => setActiveTab("notifications")}
            className="relative btn-icon"
            style={{
              background: activeTab === "notifications" ? "var(--primary-dim)" : undefined,
              color: activeTab === "notifications" ? "#a5b4fc" : "var(--text-secondary)",
            }}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 badge"
                style={{ fontSize: "9px", minWidth: "16px", height: "16px" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* User avatar chip */}
          <button
            id="navbar-profile"
            onClick={() => { setProfileUsername(currentUser.username); setActiveTab("profile"); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-full transition-all"
            style={{
              background: activeTab === "profile" ? "var(--bg-muted)" : "transparent",
              border: "1px solid transparent",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "profile") {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {currentUser.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={currentUser.name}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover"
                style={{ border: "2px solid var(--primary)" }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)" }}
              >
                {currentUser.name.charAt(0)}
              </div>
            )}
            <span
              className="text-xs font-semibold hidden md:inline max-w-24 truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {currentUser.name.split(" ")[0]}
            </span>
          </button>

          {/* Logout */}
          <button
            id="navbar-logout"
            onClick={onLogout}
            title="Sign Out"
            className="btn-icon"
            style={{ borderRadius: "var(--radius-md)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--danger-dim)";
              (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--danger)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--text-secondary)";
            }}
          >
            <LogOut className="w-4.5 h-4.5 transition-colors" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3 animate-fadeDown">
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
              onFocus={() => setIsSearching(true)}
              className="input-base"
              style={{ paddingLeft: "40px", borderRadius: "var(--radius-full)" }}
              autoFocus
            />
            {isSearching && searchQuery.trim().length > 0 && (
              <div
                className="absolute top-12 left-0 right-0 max-h-64 overflow-y-auto rounded-2xl p-2 z-50 animate-slideDown"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
              >
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center" style={{ color: "var(--text-muted)", fontSize: "13px" }}>No users found</div>
                ) : searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.username)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: "var(--primary)" }}>
                        {user.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold" style={{ color: "var(--text-primary)", fontSize: "13px" }}>{user.name}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
