import { useEffect } from "react";

interface SEOMeta {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  canonical?: string;
}

const BASE_SITE = "ConnectSphere";
const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://connectsphere.app";

const PAGE_META: Record<string, SEOMeta> = {
  feed: {
    title: `Social Feed — ${BASE_SITE}`,
    description: "Browse your personalized ConnectSphere social feed. See posts, photos and videos shared by your campus connections in real time.",
    keywords: "social feed, campus posts, student updates, photo sharing, video sharing",
    ogTitle: `Your Campus Feed — ${BASE_SITE}`,
    ogDescription: "Real-time social feed from your campus connections on ConnectSphere.",
    ogType: "website",
    canonical: `${BASE_URL}/feed`,
  },
  profile: {
    title: `My Profile — ${BASE_SITE}`,
    description: "View and manage your ConnectSphere profile. Customize your bio, profile picture, cover photo and privacy settings.",
    keywords: "user profile, student profile, ConnectSphere profile, social bio",
    ogTitle: `Profile — ${BASE_SITE}`,
    ogDescription: "Customize your ConnectSphere identity and connect with your campus peers.",
    ogType: "profile",
    canonical: `${BASE_URL}/profile`,
  },
  friends: {
    title: `Connections — ${BASE_SITE}`,
    description: "Manage your campus connections on ConnectSphere. Accept friend requests, discover new people, and grow your social network.",
    keywords: "friends, connections, campus network, friend requests, social connections",
    ogTitle: `Your Connections — ${BASE_SITE}`,
    ogDescription: "Grow your campus network — send and accept friend requests on ConnectSphere.",
    ogType: "website",
    canonical: `${BASE_URL}/friends`,
  },
  notifications: {
    title: `Notifications — ${BASE_SITE}`,
    description: "Stay updated with real-time notifications on ConnectSphere. See likes, comments, and connection activity from your campus network.",
    keywords: "notifications, social alerts, likes, comments, ConnectSphere alerts",
    ogTitle: `Notifications — ${BASE_SITE}`,
    ogDescription: "Real-time activity notifications from your ConnectSphere campus community.",
    ogType: "website",
    canonical: `${BASE_URL}/notifications`,
  },
  auth: {
    title: `Join ConnectSphere — Campus Social Network`,
    description: "Create your ConnectSphere account and start connecting with your campus community. Free to join — sign up in seconds.",
    keywords: "join ConnectSphere, sign up, campus social network, student login, create account",
    ogTitle: `Join ConnectSphere — Your Campus Social Network`,
    ogDescription: "Create a free account and connect with students across your campus. Join 10,000+ users already on ConnectSphere.",
    ogType: "website",
    canonical: `${BASE_URL}/signup`,
  },
};

// Helper to update or create a meta tag
function setMeta(attr: string, value: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Helper to update link canonical
function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function useSEO(tab: string, profileName?: string) {
  useEffect(() => {
    const meta = PAGE_META[tab] || PAGE_META.feed;

    // Title — append profile name if on profile tab
    let finalTitle = meta.title;
    if (tab === "profile" && profileName) {
      finalTitle = `${profileName} — ${BASE_SITE}`;
    }

    // Update <title>
    document.title = finalTitle;

    // Primary meta
    setMeta("name", "description", meta.description);
    if (meta.keywords) setMeta("name", "keywords", meta.keywords);

    // Open Graph
    setMeta("property", "og:title", meta.ogTitle || finalTitle);
    setMeta("property", "og:description", meta.ogDescription || meta.description);
    setMeta("property", "og:type", meta.ogType || "website");
    if (meta.canonical) setMeta("property", "og:url", meta.canonical);

    // Twitter
    setMeta("name", "twitter:title", meta.ogTitle || finalTitle);
    setMeta("name", "twitter:description", meta.ogDescription || meta.description);

    // Canonical
    if (meta.canonical) setCanonical(meta.canonical);
  }, [tab, profileName]);
}
