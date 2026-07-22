import { AppShell } from "@/components/web/AppShell";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import Link from "next/link";

export default async function Leaderboard() {
  const session = await auth.api.getSession({ headers: headers() });
  const currentUserId = session?.user?.id;

  let rankings: any[] = [];
  try {
    const result = await pool.query(
      `SELECT id, name, xp, rank, current_streak,
        (SELECT COUNT(*) FROM debates WHERE winner_id = "user".id) as wins,
        (SELECT COUNT(*) FROM debates WHERE (created_by = "user".id OR opponent_id = "user".id) AND status = 'completed') as total_debates
       FROM "user"
       WHERE xp > 0
       ORDER BY xp DESC
       LIMIT 50`
    );
    rankings = result.rows;
  } catch {}

  return (
    <AppShell>
      <div className="eyebrow">Global rankings</div>
      <h1 className="page-title">LEADERBOARD</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        Top debaters ranked by pitch points. Compete, win, and climb.
      </p>

      {rankings.length === 0 ? (
        <section className="card">
          <div className="empty-state">
            <p>No rankings yet. Be the first to debate and claim the top spot.</p>
          </div>
        </section>
      ) : (
        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          {rankings.map((user: any, i: number) => {
            const isCurrentUser = user.id === currentUserId;
            const winRate = parseInt(user.total_debates) > 0
              ? Math.round((parseInt(user.wins) / parseInt(user.total_debates)) * 100)
              : 0;

            return (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: i < rankings.length - 1 ? "1px solid var(--line)" : undefined,
                  background: isCurrentUser ? "rgba(211,58,69,0.06)" : undefined,
                }}
              >
                {/* Rank number */}
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: i < 3 ? ["rgba(255,215,0,0.15)", "rgba(192,192,192,0.15)", "rgba(205,127,50,0.15)"][i] : "#24262c",
                  color: i < 3 ? ["var(--gold)", "#c0c0c0", "#cd7f32"][i] : "var(--muted)",
                  display: "grid", placeItems: "center",
                  fontWeight: 900, fontSize: 13, flexShrink: 0,
                }}>
                  {i + 1}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: "linear-gradient(135deg, var(--red-light), #6a0e17)",
                  display: "grid", placeItems: "center",
                  fontWeight: 900, fontSize: 14, color: "white", flexShrink: 0,
                }}>
                  {(user.name || "D").slice(0, 2).toUpperCase()}
                </div>

                {/* Name + rank */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.name || "Debater"}
                    {isCurrentUser && <span style={{ color: "var(--red-light)", fontSize: 11, marginLeft: 6 }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {user.rank || "Bronze"} &middot; {winRate}% win rate
                  </div>
                </div>

                {/* XP */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: "var(--gold)" }}>
                    {user.xp || 0}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
                    XP
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
