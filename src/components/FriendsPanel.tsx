import React, { useState } from "react";
import { Users, Check, X, Eye, UserMinus, Clock, ArrowUpRight, UserPlus } from "lucide-react";
import { User } from "../types";

interface FriendsPanelProps {
  currentUser: User;
  incomingRequests: any[];
  outgoingRequests: any[];
  friendsList: any[];
  onAcceptRequest: (reqId: string) => void;
  onRejectRequest: (reqId: string) => void;
  onRemoveFriend: (friendUsername: string) => void;
  onViewProfile: (username: string) => void;
}

export default function FriendsPanel({
  currentUser, incomingRequests, outgoingRequests, friendsList,
  onAcceptRequest, onRejectRequest, onRemoveFriend, onViewProfile
}: FriendsPanelProps) {
  const [panelTab, setPanelTab] = useState<"connected" | "pending">("connected");

  const pendingCount = incomingRequests.length;

  return (
    <div id="friends-pane" className="flex-1 max-w-2xl mx-auto py-6 px-3 md:px-4 flex flex-col gap-5 pb-24 md:pb-6 animate-fadeUp">

      {/* ── Header card ── */}
      <div
        className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ padding: "20px 24px" }}
      >
        <div>
          <h2
            className="text-xl font-bold mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}
          >
            Connections
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Manage your network — {friendsList.length} friend{friendsList.length !== 1 ? "s" : ""} connected
          </p>
        </div>

        {/* Tab switcher */}
        <div className="tab-switcher" style={{ width: "fit-content", minWidth: "200px" }}>
          <button
            onClick={() => setPanelTab("connected")}
            className={`tab-item ${panelTab === "connected" ? "active" : ""}`}
            id="friends-tab-connected"
          >
            Connected ({friendsList.length})
          </button>
          <button
            onClick={() => setPanelTab("pending")}
            className={`tab-item relative ${panelTab === "pending" ? "active" : ""}`}
            id="friends-tab-pending"
          >
            Requests
            {pendingCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1"
                style={{
                  background: "var(--danger)",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 700,
                  borderRadius: "999px",
                  minWidth: "16px",
                  height: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Connected tab ── */}
      {panelTab === "connected" && (
        <div className="animate-fadeUp">
          {friendsList.length === 0 ? (
            <div
              className="card flex flex-col items-center justify-center gap-4 py-16 text-center"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--primary-dim)" }}
              >
                <Users className="w-8 h-8" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>
                  No connections yet
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.6", maxWidth: "320px" }}>
                  Use the search bar at the top to find people and send connection requests.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friendsList.map((friend, idx) => (
                <div
                  key={friend.id}
                  className="card animate-fadeUp"
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    animationDelay: `${idx * 50}ms`,
                    transition: "border-color 200ms, transform 150ms, box-shadow 200ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-active)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="cursor-pointer shrink-0"
                    onClick={() => onViewProfile(friend.username)}
                  >
                    {friend.profilePicture ? (
                      <img
                        src={friend.profilePicture}
                        alt={friend.name}
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover transition-transform hover:scale-105"
                        style={{ border: "2px solid var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white transition-transform hover:scale-105"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--primary))" }}
                      >
                        {friend.name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onViewProfile(friend.username)}
                  >
                    <h4
                      className="font-semibold text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {friend.name}
                    </h4>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      @{friend.username}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onViewProfile(friend.username)}
                      title="View Profile"
                      className="btn-icon p-2"
                      style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--accent-dim)";
                        e.currentTarget.style.borderColor = "var(--border-accent)";
                        (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "var(--border)";
                        (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--text-muted)";
                      }}
                    >
                      <Eye className="w-4 h-4 transition-colors" style={{ color: "var(--text-muted)" }} />
                    </button>
                    <button
                      onClick={() => onRemoveFriend(friend.username)}
                      title="Remove Friend"
                      className="btn-icon p-2"
                      style={{ borderRadius: "var(--radius-md)", border: "1px solid transparent" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--danger-dim)";
                        e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
                        (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--danger)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                        (e.currentTarget.querySelector("svg") as SVGElement).style.color = "var(--text-muted)";
                      }}
                    >
                      <UserMinus className="w-4 h-4 transition-colors" style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pending tab ── */}
      {panelTab === "pending" && (
        <div className="flex flex-col gap-6 animate-fadeUp">

          {/* Incoming requests */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <p className="section-label">Incoming Requests ({incomingRequests.length})</p>
              {incomingRequests.length > 0 && (
                <span className="badge badge-danger">{incomingRequests.length}</span>
              )}
            </div>

            {incomingRequests.length === 0 ? (
              <div
                className="p-5 rounded-2xl text-center"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <p style={{ color: "var(--text-faint)", fontSize: "13px" }}>
                  No incoming requests at the moment.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {incomingRequests.map((req, idx) => (
                  <div
                    key={req._id}
                    className="card flex items-center justify-between gap-3 animate-fadeUp"
                    style={{
                      padding: "14px 16px",
                      animationDelay: `${idx * 60}ms`,
                      background: "linear-gradient(135deg, rgba(34,197,94,0.04), var(--bg-surface))",
                      borderColor: "rgba(34,197,94,0.15)",
                    }}
                  >
                    <div
                      onClick={() => onViewProfile(req.senderUsername)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    >
                      {req.senderProfilePic ? (
                        <img
                          src={req.senderProfilePic}
                          alt={req.senderName}
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover shrink-0 transition-transform group-hover:scale-105"
                          style={{ border: "2px solid var(--border)" }}
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-white transition-transform group-hover:scale-105"
                          style={{ background: "linear-gradient(135deg, var(--accent-green), var(--primary))" }}
                        >
                          {req.senderName?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4
                          className="font-semibold text-sm truncate transition-colors group-hover:text-[var(--accent)]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {req.senderName}
                        </h4>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          @{req.senderUsername}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onRejectRequest(req._id)}
                        className="btn"
                        style={{
                          padding: "7px 14px",
                          fontSize: "12px",
                          background: "var(--bg-muted)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-lg)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--danger-dim)";
                          e.currentTarget.style.color = "var(--danger)";
                          e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--bg-muted)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                          e.currentTarget.style.borderColor = "var(--border)";
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                      <button
                        onClick={() => onAcceptRequest(req._id)}
                        className="btn btn-primary"
                        style={{ padding: "7px 16px", fontSize: "12px" }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing requests */}
          <div className="flex flex-col gap-3">
            <p className="section-label px-1">Sent Requests ({outgoingRequests.length})</p>

            {outgoingRequests.length === 0 ? (
              <div
                className="p-5 rounded-2xl text-center"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <p style={{ color: "var(--text-faint)", fontSize: "13px" }}>
                  No outgoing requests at the moment.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {outgoingRequests.map((req, idx) => (
                  <div
                    key={req._id}
                    className="card flex items-center justify-between gap-3 animate-fadeUp"
                    style={{ padding: "12px 16px", animationDelay: `${idx * 50}ms` }}
                  >
                    <div
                      onClick={() => onViewProfile(req.receiverUsername)}
                      className="flex items-center gap-3 cursor-pointer group min-w-0"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                        style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
                      >
                        {req.receiverUsername?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4
                          className="font-medium text-sm truncate transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--accent)")}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-secondary)")}
                        >
                          @{req.receiverUsername}
                        </h4>
                      </div>
                    </div>

                    <span
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold animate-pulse"
                      style={{
                        background: "var(--primary-dim)",
                        color: "#a5b4fc",
                        border: "1px solid var(--border-active)",
                      }}
                    >
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
