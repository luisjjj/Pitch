"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";

const CATEGORIES = ["General", "Technology", "Politics", "Philosophy"];

export default function Matchmaking() {
  const [category, setCategory] = useState("General");
  const [status, setStatus] = useState<"idle" | "searching" | "matched">("idle");
  const [debateId, setDebateId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const r = useRouter();
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/matchmaker");
        if (res.ok) {
          const data = await res.json();
          if (data.matched && data.debateId) {
            setDebateId(data.debateId);
            setTopic(data.topic || "");
            setStatus("matched");
          }
        }
      } catch {}
    }
    check();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startSearch = useCallback(async () => {
    setStatus("searching");
    setError("");
    try {
      const res = await fetch("/api/matchmaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) { setError("Failed to join queue"); setStatus("idle"); return; }
      const data = await res.json();
      if (data.matched && data.debateId) {
        setDebateId(data.debateId); setTopic(data.topic || ""); setStatus("matched"); return;
      }
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch("/api/matchmaker");
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.matched && pollData.debateId) {
              if (pollRef.current) clearInterval(pollRef.current);
              setDebateId(pollData.debateId); setTopic(pollData.topic || ""); setStatus("matched");
            }
          }
        } catch {}
      }, 3000);
    } catch { setError("Something went wrong"); setStatus("idle"); }
  }, [category]);

  const cancelSearch = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    try { await fetch("/api/matchmaker", { method: "DELETE" }); } catch {}
    setStatus("idle");
  }, []);

  return (
    <AppShell>
      <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
        <div className="eyebrow">Find an opponent</div>
        <h1 className="page-title" style={{ fontSize: 36, marginBottom: 8 }}>
          {status === "searching" ? "SEARCHING..." : status === "matched" ? "MATCH FOUND!" : "MATCHMAKE"}
        </h1>

        {status === "idle" && (
          <>
            <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Choose a category and get matched with another debater in real time.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`option ${category === c ? "selected" : ""}`}>
                  {c}
                </button>
              ))}
            </div>
            {error && (
              <div style={{ background: "#341419", color: "#ffb8bd", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <button className="button" onClick={startSearch} style={{ width: "100%" }}>
              <Search size={18} /> Find opponent
            </button>
          </>
        )}

        {status === "searching" && (
          <>
            <div style={{
              width: 120, height: 120, margin: "40px auto", borderRadius: "50%",
              border: "2px solid var(--red-light)",
              boxShadow: "0 0 0 15px rgba(211,58,69,0.08), 0 0 60px rgba(211,58,69,0.2)",
              animation: "breathe 2s ease-in-out infinite", display: "grid", placeItems: "center",
            }}>
              <LoaderCircle className="spin" size={28} color="var(--red-light)" />
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 16 }}>
              Looking for someone in <strong style={{ color: "white" }}>{category}</strong>...
            </p>
            <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
              You&apos;ll be automatically matched when someone else is searching
            </p>
            <button className="button secondary" onClick={cancelSearch} style={{ marginTop: 24, width: "100%" }}>
              Cancel
            </button>
          </>
        )}

        {status === "matched" && (
          <>
            <div style={{
              width: 100, height: 100, margin: "30px auto", borderRadius: "50%",
              background: "rgba(255,200,87,0.15)", border: "2px solid var(--gold)",
              display: "grid", placeItems: "center", fontSize: 36,
            }}>
              VS
            </div>
            {topic && (
              <div style={{
                background: "#13151a", border: "1px solid var(--line)", borderRadius: 14,
                padding: "16px 20px", marginBottom: 24, textAlign: "left",
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>
                  Topic
                </div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>&ldquo;{topic}&rdquo;</div>
              </div>
            )}
            <button className="button gold" onClick={() => r.push(`/debate/${debateId}`)} style={{ width: "100%" }}>
              Enter debate
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
