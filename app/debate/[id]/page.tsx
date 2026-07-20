"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Send, LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/web/AppShell";
import { AudioRecorder } from "@/components/web/AudioRecorder";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const r = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const transcriberRef = useRef<any>(null);

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
        transcriberRef.current = new BrowserWhisper({
          model: "whisper-base",
          language: "en",
        });
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

  const handleSubmit = useCallback(async () => {
    if (!debate) return;
    setSubmitting(true);

    try {
      let content = text;
      let audioUrl = "";
      let transcription = "";

      // Handle audio format
      if (debate.format === "Audio" && audioBlob) {
        // Transcribe in browser
        transcription = await transcribeAudio(audioBlob);

        // Upload audio to Vercel Blob
        setTranscribeProgress("Uploading audio...");
        const formData = new FormData();
        formData.append("file", audioBlob, "argument.webm");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();
        audioUrl = url;
        content = transcription || text;
      }

      // Submit argument
      const res = await fetch(`/api/debates/${debateId}/arguments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content || undefined,
          audioUrl: audioUrl || undefined,
          audioDuration: audioDuration || undefined,
          transcription: transcription || undefined,
          side: "for",
          round: 1,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit argument");

      setSubmitted(true);
      setTimeout(() => r.push(`/debate/${debateId}/results`), 1500);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
      setTranscribeProgress("");
    }
  }, [debate, text, audioBlob, audioDuration, debateId, r, transcribeAudio]);

  const isAudio = debate?.format === "Audio";
  const canSubmit = isAudio ? !!audioBlob : !!text.trim();

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
                <div className="eyebrow">
                  {debate?.format === "Audio" ? "AUDIO" : "TEXT"} &middot; YOUR TURN
                </div>
              </div>
            </div>
            <span className="tag">ACTIVE</span>
          </div>
          <div className="argument">
            {submitted
              ? "Your argument has been submitted."
              : "Make your opening case. The most convincing argument takes the round."}
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

      {!submitted && (
        <section className="card editor">
          <div className="eyebrow">
            Your opening statement {isAudio ? "(audio)" : "(text)"}
          </div>

          {isAudio ? (
            <div style={{ padding: "12px 0" }}>
              <AudioRecorder
                onRecordingComplete={handleAudioComplete}
                maxDuration={180}
                disabled={submitting}
              />
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
            <button
              className="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
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
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
              {transcribeProgress}
            </p>
          )}
        </section>
      )}

      {submitted && (
        <section className="card" style={{ textAlign: "center", padding: 32 }}>
          <div className="eyebrow">Submitted</div>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Your argument is locked in. Redirecting to results...
          </p>
        </section>
      )}
    </AppShell>
  );
}
