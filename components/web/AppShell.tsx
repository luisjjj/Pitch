"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Trophy, LayoutDashboard, Swords, Users, Wallet, UserRound, LogOut, Zap } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { NotificationBell } from "./NotificationBell";
import { useEffect, useState } from "react";

const links = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["New debate", "/debate/new", Swords],
  ["Matchmake", "/debate/matchmaking", Zap],
  ["Leaderboard", "/leaderboard", Trophy],
  ["Friends", "/friends", Users],
  ["Rewards", "/wallet", Wallet],
  ["Profile", "/profile", UserRound],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    authClient.getSession().then((res) => {
      const data = (res as any).data;
      if (data?.user?.name) setUserName(data.user.name);
    }).catch(() => {});
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link className="brand" href="/"><i className="brand-mark" />PITCH</Link>
        {userName && (
          <div style={{
            padding: "10px 14px", margin: "0 8px 4px",
            background: "#0c0d10", borderRadius: 12,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, var(--red-light), #6a0e17)",
              display: "grid", placeItems: "center",
              fontWeight: 900, fontSize: 12, color: "white", flexShrink: 0,
            }}>
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {userName}
            </div>
          </div>
        )}
        <nav className="side-nav">
          {links.map(([label, href, Icon]) => (
            <Link
              href={href}
              key={label}
              className={`side-link ${pathname.startsWith(href) ? "active" : ""}`}
            >
              <Icon size={18} />{label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NotificationBell />
          <button className="side-link sign-out-btn" onClick={handleSignOut} style={{ flex: 1 }}>
            <LogOut size={18} />Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
