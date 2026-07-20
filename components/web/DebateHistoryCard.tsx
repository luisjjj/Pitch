"use client";

import Link from "next/link";
import { getPersonaById } from "@/lib/personas";

interface DebateHistoryItem {
  id: string;
  topic: string;
  category: string;
  format: string;
  persona_id: string | null;
  opponent_type: string;
  winner_id: string | null;
  created_at: string;
  opponent_user_name: string | null;
  user_first_argument: string | null;
  argument_count: string;
}

interface DebateHistoryCardProps {
  debate: DebateHistoryItem;
  currentUserId: string;
}

export function DebateHistoryCard({ debate, currentUserId }: DebateHistoryCardProps) {
  const persona = debate.persona_id ? getPersonaById(debate.persona_id) : null;
  const won = debate.winner_id === currentUserId;
  const lost = debate.winner_id && debate.winner_id !== currentUserId;
  const opponentName = persona?.name || debate.opponent_user_name || "Opponent";
  const date = new Date(debate.created_at);
  const timeAgo = getTimeAgo(date);

  return (
    <Link href={`/debate/${debate.id}/results`} style={{ textDecoration: "none" }}>
      <div
        className="card"
        style={{
          padding: "16px 20px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          borderLeft: `4px solid ${won ? "var(--gold)" : lost ? "var(--muted)" : "#4768aa"}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>
              &ldquo;{debate.topic}&rdquo;
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="tag" style={{ fontSize: 10, padding: "2px 8px" }}>{debate.category}</span>
              <span className="tag" style={{ fontSize: 10, padding: "2px 8px" }}>{debate.format}</span>
              {persona && (
                <span
                  className="tag"
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    background: `${persona.color}22`,
                    color: persona.color,
                    border: `1px solid ${persona.color}44`,
                  }}
                >
                  {persona.avatar} {persona.name}
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 8,
                background: won ? "rgba(255,215,0,0.15)" : lost ? "rgba(255,255,255,0.05)" : "rgba(71,104,170,0.15)",
                color: won ? "var(--gold)" : lost ? "var(--muted)" : "#4768aa",
              }}
            >
              {won ? "WIN" : lost ? "LOSS" : "DRAW"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{timeAgo}</div>
          </div>
        </div>

        {debate.user_first_argument && (
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {debate.user_first_argument}
          </p>
        )}
      </div>
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
