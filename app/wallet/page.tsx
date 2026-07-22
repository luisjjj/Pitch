import { AppShell } from "@/components/web/AppShell";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

export default async function Wallet() {
  const session = await auth.api.getSession({ headers: headers() });

  let userXP = 0;
  let userRank = "Bronze";
  let totalDebates = 0;
  let wins = 0;
  let achievementsCount = 0;
  let recentXP: any[] = [];

  if (session) {
    try {
      const userResult = await pool.query(
        `SELECT xp, rank FROM "user" WHERE id = $1`,
        [session.user.id]
      );
      if (userResult.rows.length > 0) {
        userXP = userResult.rows[0].xp || 0;
        userRank = userResult.rows[0].rank || "Bronze";
      }
    } catch {}

    try {
      const statsResult = await pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE winner_id = $1) as wins
         FROM debates
         WHERE (created_by = $1 OR opponent_id = $1) AND status = 'completed'`,
        [session.user.id]
      );
      totalDebates = parseInt(statsResult.rows[0]?.total) || 0;
      wins = parseInt(statsResult.rows[0]?.wins) || 0;
    } catch {}

    try {
      const achResult = await pool.query(
        `SELECT COUNT(*) FROM user_achievements WHERE user_id = $1`,
        [session.user.id]
      );
      achievementsCount = parseInt(achResult.rows[0]?.count) || 0;
    } catch {}

    try {
      const xpResult = await pool.query(
        `SELECT amount, reason, created_at FROM xp_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
        [session.user.id]
      );
      recentXP = xpResult.rows;
    } catch {}
  }

  const milestones = [
    { xp: 100, label: "First Steps", icon: "🎯" },
    { xp: 500, label: "Bronze Debater", icon: "🥉" },
    { xp: 1500, label: "Silver Speaker", icon: "⚔️" },
    { xp: 3500, label: "Gold Orator", icon: "🏆" },
    { xp: 7000, label: "Diamond Legend", icon: "💎" },
  ];

  return (
    <AppShell>
      <div className="eyebrow">Rewards</div>
      <h1 className="page-title">REWARDS</h1>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          [`${userXP}`, "Pitch points"],
          [`${achievementsCount}`, "Badges earned"],
          [`${wins}`, "Debates won"],
        ].map(([a, b]) => (
          <div className="card stat" key={b}><small>{b}</small><b>{a}</b></div>
        ))}
      </div>

      {/* Milestones */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="eyebrow">Milestones</div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {milestones.map((m) => {
            const reached = userXP >= m.xp;
            const progress = Math.min(100, Math.round((userXP / m.xp) * 100));
            return (
              <div key={m.xp} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12,
                background: reached ? "rgba(255,200,87,0.08)" : "#0c0d10",
                border: reached ? "1px solid rgba(255,200,87,0.2)" : "1px solid transparent",
              }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: reached ? "var(--gold)" : "var(--text)" }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.xp} XP</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: "#24262c", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, borderRadius: 4, background: reached ? "var(--gold)" : "var(--red-light)" }} />
                  </div>
                </div>
                {reached && <span style={{ fontSize: 11, fontWeight: 900, color: "var(--gold)" }}>DONE</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent XP activity */}
      <section className="card">
        <div className="eyebrow">Recent activity</div>
        {recentXP.length === 0 ? (
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
            No XP activity yet. Win debates to earn points.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {recentXP.map((xp: any, i: number) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", background: "#0c0d10", borderRadius: 10,
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{xp.reason}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(xp.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ fontWeight: 900, color: "var(--gold)", fontSize: 14 }}>
                  +{xp.amount} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
