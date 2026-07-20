"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Send, LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";
import { AudioRecorder } from "@/components/web/AudioRecorder";
import { getPersonaById } from "@/lib/personas";

interface Debate {
  id: string;
  topic: string;
  category: string;
  format: string;
  status: string;
  created_by: string;
  opponent_id: string | null;
  opponent_name: string | null;
  persona_id: string | null;
  opponent_type: string;
}

export default function DebateRoom() {
  const [text, setText] = useState("");
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const r = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const transcriberRef = useRef<any>(null);

  const persona = debate?.persona_id ? getPersonaById(debate.persona_id) : null;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/debates/${debateId}`);
        if (res.ok) setDebate(await res.json());
      } catch {
        // debate not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debateId]);

  const handleAudioComplete = useCallback((blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
  }, []);

  const transcribeAudio = useCallback(async (blob: Blob): Promise<string> => {
    setTranscribing(true);
    setTranscribeProgress("Loading transcription model...");
    try {
      const { BrowserWhisper } = await import("browser-whisper");
      if (!transcriberRef.current) {
        setTranscribeProgress("Downloading whisper model (first time only)...");
        transcriberRef.current = new BrowserWhisper({ model: "whisper-base", language: "en" });
      }
      setTranscribeProgress("Transcribing audio...");
      const file = new File([blob], "argument.webm", { type: "audio/webm" });
      const segments = await transcriberRef.current.transcribe(file).collect();
      const fullText = segments.map((s: any) => s.text).join(" ").trim();
      setTranscribing(false);
      setTranscribeProgress("");
      return fullText;
    } catch (err) {
      console.error("Transcription failed:", err);
      setTranscribing(false);
      setTranscribeProgress("");
      return "";
    }
  }, []);

  const completeDebate = useCallback(async () => {
    try {
      const res = await fetch(`/api/debates/${debateId}/complete`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        setCompleted(true);
      }
    } catch (err) {
      console.error("Failed to complete debate:", err);
    }
  }, [debateId]);

  const generateAIResponse = useCallback(async (userArgument: string) => {
    if (!debate || !persona) return;
    setAiThinking(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/ai-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          topic: debate.topic,
          userArgument,
          round,
          side: "against",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.content);
      }
    } catch (err) {
      console.error("AI response failed:", err);
    } finally {
      setAiThinking(false);
    }
  }, [debate, persona, debateId, round]);

  const handleSubmit = useCallback(async () => {
    if (!debate) return;
    setSubmitting(true);
    try {
      let content = text;
      let audioUrl = "";
      let transcription = "";

      if (debate.format === "Audio" && audioBlob) {
        transcription = await transcribeAudio(audioBlob);
        setTranscribeProgress("Uploading audio...");
        const formData = new FormData();
        formData.append("file", audioBlob, "argument.webm");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();
        audioUrl = url;
        content = transcription || text;
      }

      // Save user argument
      const res = await fetch(`/api/debates/${debateId}/arguments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content || undefined,
          audioUrl: audioUrl || undefined,
          audioDuration: audioDuration || undefined,
          transcription: transcription || undefined,
          side: "for",
          round,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit argument");

      setSubmitted(true);

      // If AI opponent, generate response
      if (debate.opponent_type === "ai" && persona) {
        await generateAIResponse(content);
      }
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
      setTranscribeProgress("");
    }
  }, [debate, text, audioBlob, audioDuration, debateId, round, persona, transcribeAudio, generateAIResponse]);

  const isAudio = debate?.format === "Audio";
  const canSubmit = isAudio ? !!audioBlob : !!text.trim();

  if (loading) {
    return (
      <AppShell>
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <LoaderCircle className="spin" size={24} />
          <p style={{ marginTop: 12 }}>Loading debate...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="topic-bar">
        <div>
          <div className="eyebrow">Round {round} of 3</div>
          <strong>{debate?.topic || `Debate #${debateId}`}</strong>
        </div>
        <div className="timer">03:00</div>
      </div>

      <div className="room-grid">
        {/* User card */}
        <article className={`card fighter ${!submitted ? "active" : ""}`}>
          <div className="fighter-head">
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <div className="avatar">Y</div>
              <div>
                <strong>You</strong>
                <div className="eyebrow">
                  {debate?.format === "Audio" ? "AUDIO" : "TEXT"} &middot; YOUR TURN
                </div>
              </div>
            </div>
            <span className="tag">{submitted ? "DONE" : "ACTIVE"}</span>
          </div>
          <div className="argument">
            {submitted
              ? "Your argument has been submitted."
              : "Make your opening case. The most convincing argument takes the round."}
          </div>
        </article>

        {/* Opponent card */}
        <article className={`card fighter ${aiThinking || (!submitted && !aiResponse) ? "muted" : ""}`}>
          <div className="fighter-head">
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              {persona ? (
                <div
                  style={{
                    width: 43, height: 43, borderRadius: 14,
                    background: `${persona.color}22`, color: persona.color,
                    display: "grid", placeItems: "center",
                    fontWeight: 900, fontSize: 18,
                  }}
                >
                  {persona.avatar}
                </div>
              ) : (
                <div className="avatar" style={{ background: "linear-gradient(135deg,#4768aa,#132142)" }}>?</div>
              )}
              <div>
                <strong>{persona?.name || debate?.opponent_name || "Opponent"}</strong>
                <div className="eyebrow">
                  {persona ? (
                    <span style={{ color: persona.color }}>{persona.title}</span>
                  ) : (
                    <>AGAINST &middot; WAITING</>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="argument">
            {aiThinking ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LoaderCircle className="spin" size={16} />
                <span>{persona?.name} is thinking...</span>
              </div>
            ) : aiResponse ? (
              aiResponse
            ) : (
              <span style={{ color: "var(--muted)" }}>
                {debate?.opponent_type === "ai"
                  ? `${persona?.name || "AI"} will respond after your argument.`
                  : "Waiting for opponent to join\u2026"}
              </span>
            )}
          </div>
        </article>
      </div>

      {/* Input area */}
      {!submitted ? (
        <section className="card editor">
          <div className="eyebrow">
            Your opening statement {isAudio ? "(audio)" : "(text)"}
          </div>

          {isAudio ? (
            <div style={{ padding: "12px 0" }}>
              <AudioRecorder onRecordingComplete={handleAudioComplete} maxDuration={180} disabled={submitting} />
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={700}
              placeholder="Build your argument. Be clear, be specific, make it count."
            />
          )}

          <div className="editor-foot">
            <span>
              {isAudio
                ? audioBlob
                  ? `${audioDuration}s recorded`
                  : "Record your argument"
                : `${text.length}/700 characters`}
            </span>
            <button className="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <LoaderCircle className="spin" size={16} />
                  {transcribing ? transcribeProgress : "Submitting..."}
                </>
              ) : (
                <>
                  Submit round <Send size={16} />
                </>
              )}
            </button>
          </div>

          {transcribing && transcribeProgress && (
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>{transcribeProgress}</p>
          )}
        </section>
      ) : (
        <section className="card" style={{ textAlign: "center", padding: 32 }}>
          <div className="eyebrow">Round {round} submitted</div>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            {debate?.opponent_type === "ai" && aiResponse
              ? `${persona?.name} has responded. Ready for the next round.`
              : debate?.opponent_type === "ai"
                ? "Waiting for AI response..."
                : "Waiting for opponent..."}
          </p>
          {completed && resultData ? (
            <div style={{ marginTop: 24, padding: "20px 24px", background: "#0c0d10", borderRadius: 16, textAlign: "center" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {resultData.won ? "VICTORY" : "DEFEAT"}
              </div>
              <div style={{ font: "700 32px var(--font-display)", color: resultData.won ? "var(--gold)" : "var(--muted)", marginBottom: 8 }}>
                +{resultData.xp} XP
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                Rank: <strong style={{ color: "var(--gold)" }}>{resultData.rank}</strong>
              </div>
              {resultData.newAchievements?.length > 0 && (
                <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(255,215,0,0.07)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.2)" }}>
                  <span style={{ fontSize: 13, color: "var(--gold)" }}>
                    New achievements: {resultData.newAchievements.join(", ")}
                  </span>
                </div>
              )}
              <button
                className="button"
                style={{ marginTop: 16 }}
                onClick={() => r.push(`/debate/${debateId}/results`)}
              >
                See full results
              </button>
            </div>
          ) : aiResponse ? (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
              {round < 3 ? (
                <button
                  className="button"
                  onClick={() => {
                    setRound((r) => r + 1);
                    setSubmitted(false);
                    setAiResponse(null);
                    setText("");
                    setAudioBlob(null);
                  }}
                >
                  Next round &rarr;
                </button>
              ) : (
                <button className="button" onClick={completeDebate} disabled={completed}>
                  {completed ? "Completed!" : "End debate & see results"}
                </button>
              )}
            </div>
          ) : null}
        </section>
      )}
    </AppShell>
  );
}
