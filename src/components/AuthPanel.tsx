import React, { useState } from "react";
import { User, Mail, Lock, ArrowRight, AlertCircle, Sparkles, Globe, Users, Shield, CheckCircle } from "lucide-react";
import { User as UserType } from "../types";

interface AuthPanelProps {
  onAuthSuccess: (token: string, user: UserType) => void;
}

export default function AuthPanel({ onAuthSuccess }: AuthPanelProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { usernameOrEmail: username, password }
      : { name, username, email, password };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Failed to make request.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <Globe className="w-4 h-4" />, text: "Connect with your entire campus network" },
    { icon: <Users className="w-4 h-4" />, text: "Share moments with friends & communities" },
    { icon: <Shield className="w-4 h-4" />, text: "Privacy-first with granular post controls" },
  ];

  return (
    <main
      className="min-h-screen flex"
      style={{ background: "var(--bg-base)" }}
      aria-label="ConnectSphere Authentication"
    >
      
      {/* ── Left Brand Panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12"
        style={{
          background: "linear-gradient(145deg, #0a0f1e 0%, #0d1428 40%, #0f1830 100%)",
          borderRight: "1px solid var(--border)"
        }}
      >
        {/* Animated background blobs */}
        <div
          className="absolute w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
            top: "-80px", left: "-80px",
            animation: "blobFloat 8s ease-in-out infinite"
          }}
        />
        <div
          className="absolute w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)",
            bottom: "10%", right: "-40px",
            animation: "blobFloat 10s ease-in-out infinite reverse"
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)",
            top: "50%", left: "30%",
            animation: "blobFloat 12s ease-in-out infinite 2s"
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm"
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)",
              boxShadow: "0 4px 20px rgba(99,102,241,0.40)"
            }}
          >
            CS
          </div>
          <span
            className="font-bold text-xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}
          >
            ConnectSphere
          </span>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col gap-8 animate-fadeUp" style={{ animationDelay: "100ms" }}>
          <div>
            <h1
              className="text-5xl font-bold leading-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span style={{ color: "var(--text-primary)" }}>Your campus.</span>
              <br />
              <span className="gradient-text-primary">Your circle.</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "16px", lineHeight: "1.7" }}>
              A social platform built for students — share your life, connect with peers, and stay in sync with your community.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-slideInLeft"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--primary-dim)", color: "#a5b4fc" }}
                >
                  {f.icon}
                </div>
                <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div
            className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl w-fit"
            style={{ background: "rgba(34,211,238,0.06)", border: "1px solid var(--border-accent)" }}
          >
            <div className="flex -space-x-2">
              {["#6366f1","#22d3ee","#ec4899","#22c55e"].map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: c, borderColor: "var(--bg-base)" }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div>
              <p style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 600 }}>Join 10,000+ students</p>
              <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>already connected on campus</p>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p style={{ color: "var(--text-faint)", fontSize: "12px" }}>
            Secured with JWT authentication & encrypted storage
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs"
            style={{ background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)" }}
          >
            CS
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ConnectSphere
          </span>
        </div>

        <div className="w-full max-w-md animate-scaleIn">
          {/* Header */}
          <div className="mb-8">
            <h2
              className="text-3xl font-bold mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}
            >
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {isLogin
                ? "Sign in to reconnect with your campus circle."
                : "Join the community and start connecting."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="tab-switcher mb-7">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`tab-item ${isLogin ? "active" : ""}`}
              id="auth-login-tab"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`tab-item ${!isLogin ? "active" : ""}`}
              id="auth-register-tab"
            >
              Register
            </button>
          </div>

          {/* Error alert */}
          {error && (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl mb-5 animate-fadeDown"
              style={{
                background: "var(--danger-dim)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5"
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <p style={{ fontSize: "13px", fontWeight: 500 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Full name (register only) */}
            {!isLogin && (
              <div className="animate-fadeUp" style={{ animationDelay: "50ms" }}>
                <label className="form-label">Full Name</label>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    placeholder="Alex Mercer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-base"
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>
            )}

            {/* Username / email */}
            <div>
              <label className="form-label">
                {isLogin ? "Username or Email" : "Username"}
              </label>
              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  id="auth-username"
                  type="text"
                  required
                  placeholder={isLogin ? "alexmercer or alex@uni.edu" : "alexmercer"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-base"
                  style={{ paddingLeft: "42px" }}
                />
              </div>
            </div>

            {/* Email (register only) */}
            {!isLogin && (
              <div className="animate-fadeUp" style={{ animationDelay: "100ms" }}>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="alex@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-base"
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  style={{ paddingLeft: "42px" }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2"
              style={{ padding: "13px 20px", fontSize: "14px", fontWeight: 700, borderRadius: "14px" }}
            >
              {loading ? (
                <span
                  className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                />
              ) : (
                <>
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center mt-6" style={{ color: "var(--text-faint)", fontSize: "12px" }}>
            By continuing, you agree to ConnectSphere's{" "}
            <span style={{ color: "var(--primary)", cursor: "pointer" }}>Terms</span> &{" "}
            <span style={{ color: "var(--primary)", cursor: "pointer" }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </main>
  );
}
