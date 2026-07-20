import { AppShell } from "@/components/web/AppShell";

export default function Friends() {
  return (
    <AppShell>
      <div className="eyebrow">Your circle</div>
      <h1 className="page-title">FRIENDS</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        Challenge friends to debates, see their stats, and build your crew.
      </p>
      <section className="card">
        <div className="empty-state">
          <p>No friends yet. Share your profile and start challenging people you know.</p>
        </div>
      </section>
    </AppShell>
  );
}
