"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";
import { ScoreCard } from "@/components/web/ScoreCard";
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
  };
  arguments: Array<{
    id: string;
    debate_id: string;
    user_id: string;
    content: string;
    audio_url: string | null;
    audio_duration: number | null;
    transcription: string | null;
    round: number;
    side: string;
  }>;
  results: {
    id: string;
    winner_id: string;
    scores: Record<string, {
      logic: number;
      clarity: number;
      relevance: number;
      persuasion: number;
      total: number;
    }>;
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
          <LoaderCircle className="spin" size={24} />
          <p style={{ marginTop: 12 }}>Loading results...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="verdict">
          <div className="eyebrow">AI verdict is in</div>
          <div className="winner">NO RESULT YET.</div>
          <p style={{ color: "var(--muted)", fontSize: 18, lineHeight: 1.6 }}>
            Complete a debate to see your AI-judged score here.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: 32 }}>
            <Link className="button" href="/debate/new">Start a debate</Link>
            <Link className="button secondary" href="/dashboard">Back to dashboard</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { debate, arguments: args, results } = data;
  const persona = debate.persona_id ? getPersonaById(debate.persona_id) : null;

  // Build player info
  const userArgs = args.filter((a) => a.user_id === debate.created_by);
  const aiArgs = args.filter((a) => a.user_id.startsWith("ai-"));

  // Get round scores from results
  const scores = results?.scores || {};

  // Determine winner
  const isUserWinner = results?.winner_id === debate.created_by;

  const playerName = "You";
  const opponentName = persona?.name || "Opponent";

  // Build scorecard data
  const userScore = scores[debate.created_by] || { logic: 0, clarity: 0, relevance: 0, persuasion: 0, total: 0 };
  const aiScore = scores[`ai-${persona?.id || ""}`] || { logic: 0, clarity: 0, relevance: 0, persuasion: 0, total: 0 };

  // If no real scores yet (debate not completed), show round arguments
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

        {/* Show scorecard if results exist */}
        {results && userScore.total > 0 ? (
          <ScoreCard
            winner={{
              name: isUserWinner ? playerName : opponentName,
              avatar: isUserWinner ? "Y" : persona?.avatar || "?",
              color: isUserWinner ? "var(--red-light)" : persona?.color || "var(--muted)",
              ...userScore,
              total: isUserWinner ? userScore.total : aiScore.total,
              isWinner: true,
            }}
            loser={{
              name: isUserWinner ? opponentName : playerName,
              avatar: isUserWinner ? persona?.avatar || "?" : "Y",
              color: isUserWinner ? persona?.color || "var(--muted)" : "var(--red-light)",
              ...userScore,
              total: isUserWinner ? aiScore.total : userScore.total,
              isWinner: false,
            }}
            feedback={results.scores?.["feedback"] as any || ""}
            highlights={(results.scores?.["highlights"] as any) || []}
            bestQuote={(results.scores?.["bestQuote"] as any) || ""}
          />
        ) : (
          /* Show round-by-round arguments */
          <div style={{ display: "grid", gap: 20 }}>
            {Array.from({ length: latestRound }, (_, i) => i + 1).map((r) => {
              const userArg = args.find((a) => a.round === r && a.user_id === debate.created_by);
              const aiArg = args.find((a) => a.round === r && a.user_id.startsWith("ai-"));

              return (
                <div key={r} className="card" style={{ padding: 24 }}>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>ROUND {r}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* User argument */}
                    <div style={{ padding: "14px 16px", background: "#0c0d10", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div className="avatar" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 12 }}>Y</div>
                        <strong style={{ fontSize: 13 }}>You ({userArg?.side || "for"})</strong>
                      </div>
                      {userArg?.audio_url ? (
                        <div>
                          <audio controls src={userArg.audio_url} style={{ width: "100%", height: 36 }} />
                          {userArg.transcription && (
                            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                              {userArg.transcription}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p style={{ color: "#d7d9dd", lineHeight: 1.6, margin: 0, fontSize: 14 }}>
                          {userArg?.content || "No argument submitted."}
                        </p>
                      )}
                    </div>

                    {/* AI argument */}
                    <div style={{ padding: "14px 16px", background: "#0c0d10", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        {persona ? (
                          <div
                            style={{
                              width: 28, height: 28, borderRadius: 8,
                              background: `${persona.color}22`, color: persona.color,
                              display: "grid", placeItems: "center",
                              fontWeight: 900, fontSize: 12,
                            }}
                          >
                            {persona.avatar}
                          </div>
                        ) : (
                          <div className="avatar" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 12, background: "linear-gradient(135deg,#4768aa,#132142)" }}>?</div>
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
