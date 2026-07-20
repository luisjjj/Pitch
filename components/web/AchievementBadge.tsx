"use client";

import { useState } from "react";
import { type Achievement, RARITY_COLORS } from "@/lib/achievements";

interface AchievementBadgeProps {
  achievement: Achievement;
  earned?: boolean;
  compact?: boolean;
}

export function AchievementBadge({ achievement, earned = false, compact = false }: AchievementBadgeProps) {
  const [hovered, setHovered] = useState(false);
  const rarityColor = RARITY_COLORS[achievement.rarity];

  if (compact) {
    return (
      <div
        title={`${achievement.name}: ${achievement.description}`}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: earned ? `${rarityColor}22` : "#1a1c22",
          border: `2px solid ${earned ? rarityColor + "66" : "#292b31"}`,
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          opacity: earned ? 1 : 0.35,
          filter: earned ? "none" : "grayscale(1)",
          transition: "all 0.2s ease",
          cursor: "pointer",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {achievement.icon}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        padding: "16px 20px",
        background: earned ? `${rarityColor}11` : "#0c0d10",
        borderRadius: 16,
        border: `2px solid ${earned ? rarityColor + "44" : "#292b31"}`,
        opacity: earned ? 1 : 0.4,
        filter: earned ? "none" : "grayscale(1)",
        transition: "all 0.3s ease",
        cursor: "pointer",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: earned ? `0 4px 20px ${rarityColor}22` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rarity tag */}
      <div style={{
        position: "absolute",
        top: -8,
        right: 12,
        padding: "2px 8px",
        borderRadius: 8,
        background: rarityColor,
        color: "#000",
        fontSize: 9,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: ".1em",
      }}>
        {achievement.rarity}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${rarityColor}22`,
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          flexShrink: 0,
        }}>
          {achievement.icon}
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 2 }}>
            {achievement.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
            {achievement.description}
          </div>
        </div>
      </div>

      {/* Earned sparkle */}
      {earned && (
        <div style={{
          position: "absolute",
          top: 8,
          left: 8,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: rarityColor,
          boxShadow: `0 0 8px ${rarityColor}`,
        }} />
      )}
    </div>
  );
}
