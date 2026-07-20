"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Trophy, LayoutDashboard, Swords, Users, Wallet, UserRound, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { NotificationBell } from "./NotificationBell";

const links = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["New debate", "/debate/new", Swords],
  ["Leaderboard", "/leaderboard", Trophy],
  ["Friends", "/friends", Users],
  ["Rewards", "/wallet", Wallet],
  ["Profile", "/profile", UserRound],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link className="brand" href="/"><i className="brand-mark" />PITCH</Link>
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
