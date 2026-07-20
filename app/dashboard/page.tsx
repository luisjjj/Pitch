import Link from "next/link";
import { AppShell } from "@/components/web/AppShell";
import { FireIcon } from "@/components/web/Icons";

export default function Dashboard() {
  return (
    <AppShell>
      <div className="eyebrow">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <h1 className="page-title">READY TO RUN THE ROOM?</h1>

      <div className="stat-grid">
        {[["0", "Pitch points"], ["0 - 0", "Win / loss"], ["0%", "Win rate"], ["—", "Rank"]].map(([a, b]) => (
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
            <div className="empty-state">
              <p>No active debates yet.</p>
              <Link href="/debate/new" className="button" style={{ marginTop: 12, display: "inline-flex" }}>
                Start your first debate
              </Link>
            </div>
          </div>
        </section>

        <aside className="card">
          <div className="eyebrow">Your streak</div>
          <h2 style={{ font: "700 30px var(--font-display)", margin: "7px 0", display: "flex", alignItems: "center", gap: 8 }}>
            0 DAYS <FireIcon size={24} color="var(--muted)" />
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Debate once to start your streak and earn a 1.5× point boost.
          </p>
          <div style={{ display: "flex", gap: 7, marginTop: 24 }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
              <span key={i} style={{
                display: "grid", placeItems: "center", width: 32, height: 32,
                borderRadius: 10, background: "#24262c", fontWeight: 900,
              }}>{x}</span>
            ))}
          </div>
        </aside>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="eyebrow">Latest result</div>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          No debate results yet. Complete a debate to see your score here.
        </p>
      </section>
    </AppShell>
  );
}
