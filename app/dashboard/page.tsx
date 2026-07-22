import Link from "next/link";
import { AppShell } from "@/components/web/AppShell";
import { FireIcon } from "@/components/web/Icons";
import { getActiveDebates } from "@/app/debate/new/actions";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import { getPersonaById } from "@/lib/personas";

export default async function Dashboard() {
  const session = await auth.api.getSession({ headers: headers() });
  const debates = await getActiveDebates();

  let history: any[] = [];
  let userStats = { totalDebates: 0, wins: 0, losses: 0, personasFaced: 0 };
  let userXP = 0;
  let userRank = "Bronze";
  let userStreak = 0;

  if (session) {
    try {
      const historyResult = await pool.query(
        `SELECT d.*,
          u.name as opponent_user_name,
          (SELECT COUNT(*) FROM debate_arguments da WHERE da.debate_id = d.id) as argument_count
         FROM debates d
         LEFT JOIN "user" u ON u.id = CASE
           WHEN d.opponent_id = $1 THEN d.created_by
           ELSE d.opponent_id
         END
         WHERE (d.created_by = $1 OR d.opponent_id = $1) AND d.status = 'completed'
         ORDER BY d.created_at DESC
         LIMIT 10`,
        [session.user.id]
      );
      history = historyResult.rows;
    } catch {}

    try {
      const statsResult = await pool.query(
        `SELECT
          COUNT(*) as total_debates,
          COUNT(*) FILTER (WHERE winner_id = $1) as wins,
          COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id != $1) as losses,
          COUNT(DISTINCT persona_id) as personas_faced
         FROM debates
         WHERE (created_by = $1 OR opponent_id = $1) AND status = 'completed'`,
        [session.user.id]
      );
      const s = statsResult.rows[0];
      userStats = {
        totalDebates: parseInt(s.total_debates) || 0,
        wins: parseInt(s.wins) || 0,
        losses: parseInt(s.losses) || 0,
        personasFaced: parseInt(s.personas_faced) || 0,
      };
    } catch {}

    try {
      const userResult = await pool.query(
        `SELECT xp, rank, current_streak FROM "user" WHERE id = $1`,
        [session.user.id]
      );
      if (userResult.rows.length > 0) {
        userXP = userResult.rows[0].xp || 0;
        userRank = userResult.rows[0].rank || "Bronze";
        userStreak = userResult.rows[0].current_streak || 0;
      }
    } catch {}
  }

  return (
    <AppShell>
      <div className="eyebrow">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <h1 className="page-title">READY TO RUN THE ROOM?</h1>

      <div className="stat-grid">
        {[
          [`${userStats.wins} - ${userStats.losses}`, "Win / loss"],
          [`${userStats.totalDebates > 0 ? Math.round((userStats.wins / userStats.totalDebates) * 100) : 0}%`, "Win rate"],
          [userRank, "Rank"],
          [`${userXP} XP`, "Total XP"],
        ].map(([a, b]) => (
          <div className="card stat" key={b}><small>{b}</small><b>{a}</b></div>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="section-head">
            <div>
              <div className="eyebrow">Your move</div>
              <h2 style={{ fontSize: 27, margin: 6 }}>ACTIVE DEBATES</h2>
            </div>
            <Link href="/debate/new" className="button">New debate</Link>
          </div>
          <div className="list">
            {debates.length === 0 ? (
              <div className="empty-state">
                <p>No active debates yet.</p>
                <Link href="/debate/new" className="button" style={{ marginTop: 12, display: "inline-flex" }}>
                  Start your first debate
                </Link>
              </div>
            ) : (
              debates.map((d) => (
                <Link href={`/debate/${d.id}`} key={d.id} className="debate-row" style={{ textDecoration: "none" }}>
                  <div>
                    <strong>{d.topic}</strong>
                    <p>{d.category} &middot; {d.status === "pending" ? "Waiting for opponent" : `vs ${d.opponent_name || "TBD"}`}</p>
                  </div>
                  <span className="tag">{d.status}</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <aside className="card">
          <div className="eyebrow">Your streak</div>
          <h2 style={{ font: "700 30px var(--font-display)", margin: "7px 0", display: "flex", alignItems: "center", gap: 8 }}>
            {userStreak} DAYS <FireIcon size={24} color={userStreak > 0 ? "var(--gold)" : "var(--muted)"} />
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            {userStreak > 0
              ? `You're on fire! Keep debating daily for a 1.5x point boost.`
              : `Debate once to start your streak and earn a 1.5x point boost.`
            }
          </p>
          <div style={{ display: "flex", gap: 7, marginTop: 24 }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => {
              const today = new Date().getDay();
              const dayIndex = (today - 6 + 7) % 7;
              const isLit = i <= dayIndex && i > dayIndex - userStreak;
              return (
                <span key={i} style={{
                  display: "grid", placeItems: "center", width: 32, height: 32,
                  borderRadius: 10,
                  background: isLit ? "rgba(255,200,87,0.15)" : "#24262c",
                  color: isLit ? "var(--gold)" : "var(--muted)",
                  fontWeight: 900,
                }}>{x}</span>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Recent history */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Recent debates</div>
            <h2 style={{ fontSize: 22, margin: 6 }}>HISTORY</h2>
          </div>
          {history.length > 0 && (
            <Link href="/profile" className="button secondary" style={{ fontSize: 13, padding: "6px 14px" }}>
              View all
            </Link>
          )}
        </div>
        {history.length === 0 ? (
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            No debate results yet. Complete a debate to see your history here.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {history.map((d: any) => {
              const persona = d.persona_id ? getPersonaById(d.persona_id) : null;
              const won = d.winner_id === session?.user?.id;
              const opponentName = persona?.name || d.opponent_user_name || "Opponent";
              const date = new Date(d.created_at);
              const timeAgo = getTimeAgo(date);

              return (
                <Link
                  key={d.id}
                  href={`/debate/${d.id}/results`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      padding: "14px 18px",
                      background: "#0c0d10",
                      borderRadius: 14,
                      borderLeft: `3px solid ${won ? "var(--gold)" : "#4768aa"}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                        &ldquo;{d.topic}&rdquo;
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        vs {opponentName} &middot; {d.category}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          padding: "3px 10px",
                          borderRadius: 8,
                          background: won ? "rgba(255,215,0,0.15)" : "rgba(71,104,170,0.15)",
                          color: won ? "var(--gold)" : "#4768aa",
                        }}
                      >
                        {won ? "WIN" : "LOSS"}
                      </span>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{timeAgo}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
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
