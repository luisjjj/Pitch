"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";
import { getPersonaById } from "@/lib/personas";

interface DebateData {
  debate: {
    id: string;
    topic: string;
    category: string;
    format: string;
    persona_id: string | null;
    opponent_type: string;
    created_by: string;
    winner_id: string | null;
    status: string;
  };
  arguments: Array<{
    id: string;
    debate_id: string;
    user_id: string;
    content: string;
    round: number;
    side: string;
  }>;
  results: {
    id: string;
    winner_id: string;
    scores: Record<string, any>;
    created_at: string;
  } | null;
}

export default function Results() {
  const [data, setData] = useState<DebateData | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const debateId = params.id as string;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/debates/${debateId}/results`);
        if (res.ok) setData(await res.json());
      } catch {
        // failed
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debateId]);

  if (loading) {
    return (
      <AppShell>
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <div className="spin" style={{ width: 24, height: 24, border: "2px solid var(--line)", borderTopColor: "var(--red-light)", borderRadius: "50%", margin: "0 auto 12px" }} />
          <p style={{ marginTop: 12 }}>Loading results...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div className="eyebrow">No result</div>
          <h1 className="page-title" style={{ fontSize: 36, marginTop: 8 }}>NO RESULT YET</h1>
          <p style={{ color: "var(--muted)", fontSize: 16 }}>
            Complete a debate to see results here.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <Link className="button" href="/debate/new">Start a debate</Link>
            <Link className="button secondary" href="/dashboard">Back to dashboard</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { debate, arguments: args, results } = data;
  const persona = debate.persona_id ? getPersonaById(debate.persona_id) : null;
  const playerName = "You";
  const opponentName = persona?.name || "Opponent";

  // Determine winner — check debate_results first, then debates table, then calculate
  let winnerId = results?.winner_id || debate.winner_id;
  if (!winnerId && debate.status === "completed") {
    const userArgs = args.filter((a) => a.user_id === debate.created_by);
    const aiArgs = args.filter((a) => a.user_id.startsWith("ai-"));
    winnerId = userArgs.length >= aiArgs.length ? debate.created_by : (aiArgs[0]?.user_id || null);
  }

  const isUserWinner = winnerId === debate.created_by;
  const scores = results?.scores || {};

  const userScore = scores[debate.created_by] || null;
  const aiScoreKey = Object.keys(scores).find((k) => k.startsWith("ai-")) || "";
  const aiScore = scores[aiScoreKey] || null;

  // Get arguments per round
  const latestRound = Math.max(...args.map((a) => a.round), 0);

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Topic header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="eyebrow">DEBATE COMPLETE</div>
          <h1 className="page-title" style={{ fontSize: 32, marginBottom: 4 }}>
            &ldquo;{debate.topic}&rdquo;
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            {debate.category} &middot; {debate.format} &middot; {latestRound} round{latestRound !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Winner banner */}
        <div style={{
          textAlign: "center", padding: "32px 20px",
          background: isUserWinner
            ? "linear-gradient(135deg, rgba(255,200,87,0.12), rgba(255,200,87,0.04))"
            : "linear-gradient(135deg, rgba(71,104,170,0.12), rgba(71,104,170,0.04))",
          borderRadius: 20, marginBottom: 24,
          border: `1px solid ${isUserWinner ? "rgba(255,200,87,0.25)" : "rgba(71,104,170,0.25)"}`,
        }}>
          <div style={{
            font: "800 clamp(42px, 8vw, 72px) var(--font-display)",
            letterSpacing: "-.06em",
            color: isUserWinner ? "var(--gold)" : "var(--muted)",
            marginBottom: 8,
          }}>
            {isUserWinner ? "VICTORY" : "DEFEAT"}
          </div>
          {persona && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: isUserWinner ? "rgba(255,200,87,0.2)" : `${persona.color}22`,
                color: isUserWinner ? "var(--gold)" : persona.color,
                display: "grid", placeItems: "center",
                fontWeight: 900, fontSize: 14,
              }}>
                {isUserWinner ? "Y" : persona.avatar}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {isUserWinner ? "You beat" : `${opponentName} beat`} {opponentName}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {isUserWinner ? "Well argued." : "Better luck next time."}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Round-by-round arguments */}
        <div style={{ display: "grid", gap: 16 }}>
          {Array.from({ length: latestRound }, (_, i) => i + 1).map((r) => {
            const userArg = args.find((a) => a.round === r && a.user_id === debate.created_by);
            const aiArg = args.find((a) => a.round === r && a.user_id.startsWith("ai-"));

            return (
              <div key={r} className="card" style={{ padding: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>ROUND {r}</div>
                <div style={{ display: "grid", gap: 16 }}>
                  {/* User argument */}
                  <div style={{ padding: "14px 16px", background: "#0c0d10", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: "var(--red-light)", color: "white",
                        display: "grid", placeItems: "center",
                        fontWeight: 900, fontSize: 11,
                      }}>Y</div>
                      <strong style={{ fontSize: 13 }}>You ({userArg?.side || "for"})</strong>
                    </div>
                    <p style={{ color: "#d7d9dd", lineHeight: 1.6, margin: 0, fontSize: 14 }}>
                      {userArg?.content || "No argument submitted."}
                    </p>
                  </div>

                  {/* AI argument */}
                  <div style={{ padding: "14px 16px", background: "#0c0d10", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      {persona ? (
                        <div style={{
                          width: 26, height: 26, borderRadius: 8,
                          background: `${persona.color}22`, color: persona.color,
                          display: "grid", placeItems: "center",
                          fontWeight: 900, fontSize: 11,
                        }}>
                          {persona.avatar}
                        </div>
                      ) : (
                        <div style={{
                          width: 26, height: 26, borderRadius: 8,
                          background: "#4768aa22", color: "#4768aa",
                          display: "grid", placeItems: "center",
                          fontWeight: 900, fontSize: 11,
                        }}>?</div>
                      )}
                      <strong style={{ fontSize: 13 }}>{opponentName} ({aiArg?.side || "against"})</strong>
                    </div>
                    <p style={{ color: "#d7d9dd", lineHeight: 1.6, margin: 0, fontSize: 14 }}>
                      {aiArg?.content || "Awaiting response..."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        {scores.feedback && (
          <div className="card" style={{ marginTop: 16, padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>AI Feedback</div>
            <p style={{ color: "#d7d9dd", lineHeight: 1.6, margin: 0 }}>{scores.feedback}</p>
          </div>
        )}

        {/* Score breakdown */}
        {userScore && (
          <div className="card" style={{ marginTop: 16, padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Score Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* User scores */}
              <div style={{ padding: "14px 16px", background: "#0c0d10", borderRadius: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: "var(--red-light)" }}>You</div>
                {["logic", "clarity", "relevance", "persuasion"].map((key) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>{key}</span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{userScore[key] ?? "—"}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 900 }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "var(--gold)" }}>{userScore.total ?? "—"}</span>
                </div>
              </div>

              {/* AI scores */}
              {aiScore && (
                <div style={{ padding: "14px 16px", background: "#0c0d10", borderRadius: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: "#4768aa" }}>{opponentName}</div>
                  {["logic", "clarity", "relevance", "persuasion"].map((key) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>{key}</span>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{aiScore[key] ?? "—"}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 900 }}>Total</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: "#4768aa" }}>{aiScore.total ?? "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
          <Link className="button" href="/debate/new">New debate</Link>
          <Link className="button secondary" href="/dashboard">Dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}
