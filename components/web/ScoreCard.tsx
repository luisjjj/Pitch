"use client";

import { ScoreBar } from "./ScoreBar";

interface PlayerScore {
  name: string;
  avatar: string;
  color: string;
  logic: number;
  clarity: number;
  relevance: number;
  persuasion: number;
  total: number;
  isWinner: boolean;
}

interface ScoreCardProps {
  winner: PlayerScore;
  loser: PlayerScore;
  feedback: string;
  highlights: string[];
  bestQuote: string;
  round?: number;
}

export function ScoreCard({ winner, loser, feedback, highlights, bestQuote, round }: ScoreCardProps) {
  return (
    <div className="card" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="eyebrow">{round ? `ROUND ${round} RESULT` : "FINAL VERDICT"}</div>
        <div style={{ font: "700 clamp(36px, 5vw, 56px) var(--font-display)", letterSpacing: "-.06em", marginTop: 8, color: winner.color }}>
          {winner.name}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 15, fontWeight: 800 }}>WINS THE ROUND</div>
      </div>

      {/* Score comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
        {/* Winner column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: `${winner.color}22`, color: winner.color,
                display: "grid", placeItems: "center",
                fontWeight: 900, fontSize: 16,
              }}
            >
              {winner.avatar}
            </div>
            <div>
              <strong>{winner.name}</strong>
              <div style={{ font: "700 18px var(--font-mono)", color: winner.color }}>{winner.total.toFixed(1)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <ScoreBar label="Logic" score={winner.logic} color={winner.color} />
            <ScoreBar label="Clarity" score={winner.clarity} color={winner.color} />
            <ScoreBar label="Relevance" score={winner.relevance} color={winner.color} />
            <ScoreBar label="Persuasion" score={winner.persuasion} color={winner.color} />
          </div>
        </div>

        {/* Loser column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: `${loser.color}22`, color: loser.color,
                display: "grid", placeItems: "center",
                fontWeight: 900, fontSize: 16,
              }}
            >
              {loser.avatar}
            </div>
            <div>
              <strong>{loser.name}</strong>
              <div style={{ font: "700 18px var(--font-mono)", color: loser.color }}>{loser.total.toFixed(1)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <ScoreBar label="Logic" score={loser.logic} color={loser.color} />
            <ScoreBar label="Clarity" score={loser.clarity} color={loser.color} />
            <ScoreBar label="Relevance" score={loser.relevance} color={loser.color} />
            <ScoreBar label="Persuasion" score={loser.persuasion} color={loser.color} />
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ padding: "16px 20px", background: "#0c0d10", borderRadius: 14, marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Judge&apos;s feedback</div>
          <p style={{ color: "#d7d9dd", lineHeight: 1.6, margin: 0 }}>{feedback}</p>
        </div>
      )}

      {/* Highlights + Best Quote */}
      <div style={{ display: "grid", gridTemplateColumns: highlights.length > 0 ? "1fr 1fr" : "1fr", gap: 16 }}>
        {highlights.length > 0 && (
          <div style={{ padding: "16px 20px", background: "#0c0d10", borderRadius: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Highlights</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#d7d9dd", lineHeight: 1.8 }}>
              {highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </div>
        )}
        {bestQuote && (
          <div style={{ padding: "16px 20px", background: "#0c0d10", borderRadius: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Best quote</div>
            <p style={{ color: "var(--gold)", fontStyle: "italic", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              &ldquo;{bestQuote}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
