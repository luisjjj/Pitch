"use client";

import { useEffect, useRef } from "react";

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
  color?: string;
}

export function ScoreBar({ label, score, maxScore = 10, color = "var(--red-light)" }: ScoreBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const percent = Math.min(100, (score / maxScore) * 100);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (barRef.current) barRef.current.style.width = `${percent}%`;
        });
      });
    }
  }, [percent]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 40px", gap: 12, alignItems: "center" }}>
      <span style={{ fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>
        {label}
      </span>
      <div style={{ height: 10, background: "#292b31", borderRadius: 9, overflow: "hidden" }}>
        <div
          ref={barRef}
          style={{
            height: "100%",
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: 9,
            transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
      <span style={{ fontWeight: 900, fontSize: 15, textAlign: "right", font: "700 15px var(--font-mono)" }}>
        {score}
      </span>
    </div>
  );
}
