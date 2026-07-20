import Link from "next/link";
import { AppShell } from "@/components/web/AppShell";

export default function Results() {
  return (
    <AppShell>
      <div className="verdict">
        <div className="eyebrow">AI verdict is in</div>
        <div className="winner">NO RESULT YET.</div>
        <p style={{ color: "var(--muted)", fontSize: 18, lineHeight: 1.6 }}>
          Complete a debate to see your AI-judged score here. The verdict evaluates
          argument strength, rebuttal quality, clarity, evidence, and delivery.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center", marginTop: 32 }}>
          <Link className="button" href="/debate/new">Start a debate</Link>
          <Link className="button secondary" href="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}
