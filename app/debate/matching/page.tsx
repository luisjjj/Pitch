"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/web/AppShell";

export default function Matching() {
  const r = useRouter();
  useEffect(() => {
    const t = setTimeout(() => r.push("/debate/demo-room"), 3500);
    return () => clearTimeout(t);
  }, [r]);

  return (
    <AppShell>
      <div className="matching">
        <div>
          <div className="match-orb">
            <div>
              <strong>SEARCHING</strong>
              <span>for your next opponent</span>
            </div>
          </div>
          <h1 className="page-title" style={{ marginTop: 50, fontSize: 37 }}>
            THE ARENA IS LISTENING
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Finding someone who disagrees with you…
          </p>
          <p style={{ color: "var(--gold)", fontWeight: 900, marginTop: 24 }}>
            Estimated wait: 12 seconds
          </p>
          <button
            className="pill"
            style={{ marginTop: 20 }}
            onClick={() => r.push("/dashboard")}
          >
            Cancel search
          </button>
        </div>
      </div>
    </AppShell>
  );
}
