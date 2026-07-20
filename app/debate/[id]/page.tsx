"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Send } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";

interface Debate {
  id: string;
  topic: string;
  category: string;
  format: string;
  status: string;
  created_by: string;
  opponent_id: string | null;
  opponent_name: string | null;
}

export default function DebateRoom() {
  const [text, setText] = useState("");
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const r = useRouter();
  const params = useParams();
  const debateId = params.id as string;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/debates/${debateId}`);
        if (res.ok) {
          setDebate(await res.json());
        }
      } catch {
        // debate not found, show fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debateId]);

  return (
    <AppShell>
      <div className="topic-bar">
        <div>
          <div className="eyebrow">Round 1 of 3</div>
          <strong>{debate?.topic || `Debate #${debateId}`}</strong>
        </div>
        <div className="timer">03:00</div>
      </div>

      <div className="room-grid">
        <article className="card fighter active">
          <div className="fighter-head">
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <div className="avatar">Y</div>
              <div>
                <strong>You</strong>
                <div className="eyebrow">FOR &middot; YOUR TURN</div>
              </div>
            </div>
            <span className="tag">ACTIVE</span>
          </div>
          <div className="argument">
            Make your opening case. The most convincing argument takes the round.
          </div>
        </article>

        <article className="card fighter muted">
          <div className="fighter-head">
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <div className="avatar" style={{ background: "linear-gradient(135deg,#4768aa,#132142)" }}>?</div>
              <div>
                <strong>{debate?.opponent_name || "Opponent"}</strong>
                <div className="eyebrow">AGAINST &middot; WAITING</div>
              </div>
            </div>
          </div>
          <div className="argument">Waiting for opponent to join&hellip;</div>
        </article>
      </div>

      <section className="card editor">
        <div className="eyebrow">Your opening statement</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={700}
          placeholder="Build your argument. Be clear, be specific, make it count."
        />
        <div className="editor-foot">
          <span>{text.length}/700 characters</span>
          <button
            className="button"
            disabled={!text.trim()}
            onClick={() => r.push(`/debate/${debateId}/results`)}
          >
            Submit round <Send size={16} />
          </button>
        </div>
      </section>
    </AppShell>
  );
}
