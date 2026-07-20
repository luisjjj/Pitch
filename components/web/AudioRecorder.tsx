"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Pause, LoaderCircle } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  maxDuration?: number;
  disabled?: boolean;
}

export function AudioRecorder({
  onRecordingComplete,
  maxDuration = 180,
  disabled = false,
}: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [previewUrl]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setHasRecording(true);
        onRecordingComplete(blob, elapsed);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(100);
      setRecording(true);
      setPaused(false);
      setElapsed(0);
      setHasRecording(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert("Microphone access is required for audio debates.");
    }
  }, [maxDuration, onRecordingComplete, elapsed, previewUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setPaused(false);
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setPaused(false);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  }, [maxDuration, stopRecording]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [playing]);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setHasRecording(false);
    setElapsed(0);
    setPlaying(false);
  }, [previewUrl]);

  const progress = maxDuration > 0 ? (elapsed / maxDuration) * 100 : 0;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Timer + Progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 22,
            fontWeight: 500,
            color: recording ? "#ff4550" : "var(--gold)",
          }}
        >
          {formatTime(elapsed)} / {formatTime(maxDuration)}
        </div>
        {recording && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ff4550", fontWeight: 900, fontSize: 13 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ff4550",
                animation: "blink 1s ease-in-out infinite",
              }}
            />
            {paused ? "PAUSED" : "RECORDING"}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "#292b31", borderRadius: 9, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: recording ? "linear-gradient(90deg, #8e1420, #ff4550)" : "var(--gold)",
            borderRadius: 9,
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!recording && !hasRecording && (
          <button
            className="button"
            onClick={startRecording}
            disabled={disabled}
            style={{ flex: 1 }}
          >
            <Mic size={18} /> Start recording
          </button>
        )}

        {recording && (
          <>
            <button
              className="button secondary"
              onClick={paused ? resumeRecording : pauseRecording}
              style={{ flex: 1 }}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button className="button" onClick={stopRecording} style={{ flex: 1 }}>
              <Square size={18} /> Stop
            </button>
          </>
        )}

        {hasRecording && previewUrl && (
          <>
            <audio
              ref={audioRef}
              src={previewUrl}
              onEnded={() => setPlaying(false)}
              preload="metadata"
            />
            <button className="button secondary" onClick={togglePlayback} style={{ flex: 1 }}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
              {playing ? "Pause preview" : "Play preview"}
            </button>
            <button className="button secondary" onClick={reset} style={{ flex: 0 }}>
              Reset
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes blink{50%{opacity:.3}}`}</style>
    </div>
  );
}
