import { AppShell } from "@/components/web/AppShell";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import { getPersonaById } from "@/lib/personas";
import Link from "next/link";

export default async function Profile() {
  const session = await auth.api.getSession({ headers: headers() });

  if (!session) {
    return (
      <AppShell>
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--muted)" }}>Please log in to view your profile.</p>
          <Link className="button" href="/auth" style={{ marginTop: 16, display: "inline-flex" }}>
            Log in
          </Link>
        </div>
      </AppShell>
    );
  }

  const userId = session.user.id;
  let userName = "Debater";
  let userEmail = "";
  let createdAt = new Date();
  let userXP = 0;
  let userRank = "Bronze";
  let userStreak = 0;
  let totalDebates = 0;
  let wins = 0;
  let losses = 0;
  let personasFaced = 0;
  let recentDebates: any[] = [];
  let achievements: any[] = [];

  try {
    const userResult = await pool.query(
      `SELECT name, email, created_at, xp, rank, current_streak FROM "user" WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length > 0) {
      const u = userResult.rows[0];
      userName = u.name || "Debater";
      userEmail = u.email || "";
      createdAt = new Date(u.created_at);
      userXP = u.xp || 0;
      userRank = u.rank || "Bronze";
      userStreak = u.current_streak || 0;
    }
  } catch {}

  try {
    const statsResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE winner_id = $1) as wins,
        COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id != $1) as losses,
        COUNT(DISTINCT persona_id) as personas
       FROM debates
       WHERE (created_by = $1 OR opponent_id = $1) AND status = 'completed'`,
      [userId]
    );
    const s = statsResult.rows[0];
    totalDebates = parseInt(s.total) || 0;
    wins = parseInt(s.wins) || 0;
    losses = parseInt(s.losses) || 0;
    personasFaced = parseInt(s.personas) || 0;
  } catch {}

  try {
    const historyResult = await pool.query(
      `SELECT d.*, d.winner_id,
        (SELECT COUNT(*) FROM debate_arguments da WHERE da.debate_id = d.id) as arg_count
       FROM debates d
       WHERE (d.created_by = $1 OR d.opponent_id = $1) AND d.status = 'completed'
       ORDER BY d.created_at DESC
       LIMIT 10`,
      [userId]
    );
    recentDebates = historyResult.rows;
  } catch {}

  try {
    const achResult = await pool.query(
      `SELECT ua.*, a.name, a.description, a.icon, a.rarity
       FROM user_achievements ua
       LEFT JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC
       LIMIT 10`,
      [userId]
    );
    achievements = achResult.rows;
  } catch {}

  const winRate = totalDebates > 0 ? Math.round((wins / totalDebates) * 100) : 0;
  const memberSince = createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <div className="eyebrow">Your profile</div>
      <h1 className="page-title">PROFILE</h1>

      <div className="dashboard-grid">
        {/* Left: User info + stats */}
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: "linear-gradient(135deg, var(--red-light), #6a0e17)",
              display: "grid", placeItems: "center",
              fontWeight: 900, fontSize: 22, color: "white", flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <h2 style={{ margin: 0, font: "700 22px var(--font-display)" }}>{userName}</h2>
              <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>
                {userEmail} &middot; Member since {memberSince}
              </p>
            </div>
          </div>

          {/* Rank + XP */}
          <div style={{
            background: "#0c0d10", borderRadius: 14, padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".1em" }}>
                Rank
              </div>
              <div style={{ font: "700 20px var(--font-display)", marginTop: 4 }}>{userRank}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".1em" }}>
                Total XP
              </div>
              <div style={{ font: "700 20px var(--font-display)", color: "var(--gold)", marginTop: 4 }}>{userXP}</div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              [`${totalDebates}`, "Debates"],
              [`${wins}`, "Wins"],
              [`${winRate}%`, "Win rate"],
            ].map(([a, b]) => (
              <div key={b} style={{ textAlign: "center", padding: 14 }}>
                <b style={{ display: "block", font: "700 24px var(--font-display)" }}>{a}</b>
                <small style={{ color: "var(--muted)", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", fontSize: 11 }}>{b}</small>
              </div>
            ))}
          </div>

          {/* Streak */}
          <div style={{
            background: "#0c0d10", borderRadius: 14, padding: "14px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".1em" }}>
                Daily streak
              </div>
              <div style={{ font: "700 18px var(--font-display)", marginTop: 2 }}>
                {userStreak} day{userStreak !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ fontSize: 24 }}>{userStreak > 0 ? "🔥" : "—"}</div>
          </div>
        </section>

        {/* Right: Achievements + History */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Achievements */}
          <div className="card">
            <div className="eyebrow">Achievements</div>
            {achievements.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                No achievements yet. Complete debates to earn them.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {achievements.map((ach: any) => (
                  <div key={ach.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", background: "#0c0d10", borderRadius: 10,
                  }}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{ach.icon || "🏆"}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{ach.name}</div>
                      <div style={{ color: "var(--muted)", fontSize: 11 }}>{ach.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent debates */}
          <div className="card">
            <div className="eyebrow">Recent debates</div>
            {recentDebates.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                No debates yet. Start one to see your history.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {recentDebates.map((d: any) => {
                  const persona = d.persona_id ? getPersonaById(d.persona_id) : null;
                  const won = d.winner_id === userId;
                  const opponentName = persona?.name || "Human";
                  return (
                    <Link
                      key={d.id}
                      href={`/debate/${d.id}/results`}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", background: "#0c0d10", borderRadius: 10,
                        textDecoration: "none", borderLeft: `3px solid ${won ? "var(--gold)" : "#4768aa"}`,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          &ldquo;{d.topic}&rdquo;
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>vs {opponentName}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 6,
                        background: won ? "rgba(255,200,87,0.15)" : "rgba(71,104,170,0.15)",
                        color: won ? "var(--gold)" : "#4768aa", flexShrink: 0, marginLeft: 8,
                      }}>
                        {won ? "WIN" : "LOSS"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
