import { AppShell } from "@/components/web/AppShell";

export default function Leaderboard() {
  return (
    <AppShell>
      <div className="eyebrow">Global rankings</div>
      <h1 className="page-title">LEADERBOARD</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        Top debaters ranked by pitch points. Compete, win, and climb.
      </p>
      <section className="card">
        <div className="empty-state">
          <p>No rankings yet. Be the first to debate and claim the top spot.</p>
        </div>
      </section>
    </AppShell>
  );
}
