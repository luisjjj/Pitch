import { AppShell } from "@/components/web/AppShell";

export default function Profile() {
  return (
    <AppShell>
      <div className="eyebrow">Your profile</div>
      <h1 className="page-title">PROFILE</h1>
      <div className="dashboard-grid">
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div className="avatar" style={{ width: 64, height: 64, borderRadius: 18, fontSize: 24 }}>Y</div>
            <div>
              <h2 style={{ margin: 0, font: "700 22px var(--font-display)" }}>Your Name</h2>
              <p style={{ color: "var(--muted)", margin: 0 }}>Member since {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[["0", "Debates"], ["0", "Wins"], ["0%", "Win rate"]].map(([a, b]) => (
              <div key={b} style={{ textAlign: "center", padding: 16 }}>
                <b style={{ display: "block", font: "700 24px var(--font-display)" }}>{a}</b>
                <small style={{ color: "var(--muted)", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", fontSize: 11 }}>{b}</small>
              </div>
            ))}
          </div>
        </section>
        <aside className="card">
          <div className="eyebrow">Settings</div>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
            Account settings, notification preferences, and theme options coming soon.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
