"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markRead = async (ids?: string[]) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ids || null }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        style={{
          background: "none", border: "none", color: "var(--muted)",
          cursor: "pointer", padding: 8, borderRadius: 10,
          position: "relative", display: "grid", placeItems: "center",
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            width: 16, height: 16, borderRadius: "50%",
            background: "var(--red-light)", color: "white",
            fontSize: 9, fontWeight: 900,
            display: "grid", placeItems: "center",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 8,
            width: 320, maxHeight: 400, overflowY: "auto",
            background: "#181a1f", border: "1px solid var(--line)",
            borderRadius: 14, zIndex: 91, boxShadow: "0 8px 32px rgba(0,0,0,.4)",
          }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 900, fontSize: 13 }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markRead()}
                  style={{ background: "none", border: "none", color: "var(--red-light)", cursor: "pointer", fontSize: 11, fontWeight: 800 }}
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 16px", borderBottom: "1px solid var(--line)",
                    background: n.read ? "transparent" : "rgba(211,58,69,0.05)",
                    cursor: "pointer",
                  }}
                  onClick={() => markRead([n.id])}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }}>{n.body}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
