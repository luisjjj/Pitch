import { AppShell } from "@/components/web/AppShell";

export default function Wallet() {
  return (
    <AppShell>
      <div className="eyebrow">Rewards</div>
      <h1 className="page-title">REWARDS</h1>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[["0", "Pitch points"], ["0", "Badges earned"], ["$0.00", "Cash out"]].map(([a, b]) => (
          <div className="card stat" key={b}><small>{b}</small><b>{a}</b></div>
        ))}
      </div>
      <section className="card">
        <div className="eyebrow">Available rewards</div>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
          Earn pitch points by winning debates. Redeem them for rewards, badges, and more.
        </p>
        <div className="empty-state" style={{ marginTop: 16 }}>
          <p>No rewards available yet. Start debating to earn points.</p>
        </div>
      </section>
    </AppShell>
  );
}
