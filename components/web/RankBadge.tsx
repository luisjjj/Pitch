"use client";

import { getXPProgress } from "@/lib/ranks";

interface RankBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

export function RankBadge({ xp, size = "md", showProgress = false }: RankBadgeProps) {
  const { current, next, progress } = getXPProgress(xp);

  const sizes = {
    sm: { badge: 28, icon: 14, text: 11, bar: 40 },
    md: { badge: 40, icon: 20, text: 13, bar: 80 },
    lg: { badge: 56, icon: 28, text: 15, bar: 120 },
  }[size];

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", display: "inline-flex" }}>
        <div
          style={{
            width: sizes.badge,
            height: sizes.badge,
            borderRadius: size === "lg" ? 16 : 12,
            background: `linear-gradient(135deg, ${current.color}33, ${current.color}11)`,
            border: `2px solid ${current.color}66`,
            boxShadow: `0 0 12px ${current.glow}`,
            display: "grid",
            placeItems: "center",
            fontSize: sizes.icon,
          }}
        >
          {current.icon}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontWeight: 900,
          fontSize: sizes.text,
          color: current.color,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          lineHeight: 1,
        }}>
          {current.name}
        </div>
      </div>

      {showProgress && next && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{
            width: sizes.bar,
            height: 4,
            background: "#292b31",
            borderRadius: 4,
            overflow: "hidden",
          }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${current.color}cc, ${current.color})`,
              borderRadius: 4,
              transition: "width 0.8s ease",
            }} />
          </div>
          <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>
            {xp} / {next.minXP} XP
          </span>
        </div>
      )}
    </div>
  );
}
