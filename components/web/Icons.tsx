import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function FireIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2C6.5 8 4 12.5 4 15a8 8 0 0016 0c0-2.5-2.5-7-8-13z" fill={color} opacity={0.85} />
      <path d="M12 10c-2 3-3.5 5-3.5 6.5a3.5 3.5 0 007 0c0-1.5-1.5-3.5-3.5-6.5z" fill={color} opacity={0.5} />
    </svg>
  );
}

export function BuildingIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 21h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M5 21V7l7-4 7 4v14" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M9 21v-5h6v5" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M9 10h1M14 10h1M9 14h1M14 14h1" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function ClapperIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x={3} y={8} width={18} height={13} rx={2} stroke={color} strokeWidth={2} />
      <path d="M3 8l3-4h12l3 4" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M7.5 4L10 8M13.5 4L11 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function BallIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10A15 15 0 0112 2z" stroke={color} strokeWidth={1.5} />
      <path d="M2 12h20" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

export function BulbIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3a6 6 0 00-4 10.5V17a1 1 0 001 1h6a1 1 0 001-1v-3.5A6 6 0 0012 3z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M9 21h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M12 3v-1M4.2 7.3L3.5 6.6M3 13h-1M21 13h1M20.5 6.6l-.7.7M19.8 7.3l.7-.7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function MoneyIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <path d="M12 6v12M9 8.5c0-1 1.3-2 3-2s3 1 3 2-1.3 1.5-3 2-3 1-3 2 1.3 2 3 2 3-1 3-2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function GlobeIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <ellipse cx={12} cy={12} rx={4} ry={10} stroke={color} strokeWidth={1.5} />
      <path d="M2 12h20M3 7h18M3 17h18" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

export function CapIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4L2 9l10 5 10-5-10-5z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M6 11.5v5c0 1 2.7 3 6 3s6-2 6-3v-5" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M21 9v7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function BrainIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2a7 7 0 00-4.6 12.3c.5.5.8 1.1.9 1.7H12h3.7c.1-.6.4-1.2.9-1.7A7 7 0 0012 2z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M9 16v2a3 3 0 006 0v-2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M12 2v4M8.5 5.5l2 2.5M15.5 5.5l-2 2.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function AtomIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={2} fill={color} />
      <ellipse cx={12} cy={12} rx={10} ry={4} stroke={color} strokeWidth={1.5} transform="rotate(0 12 12)" />
      <ellipse cx={12} cy={12} rx={10} ry={4} stroke={color} strokeWidth={1.5} transform="rotate(60 12 12)" />
      <ellipse cx={12} cy={12} rx={10} ry={4} stroke={color} strokeWidth={1.5} transform="rotate(120 12 12)" />
    </svg>
  );
}

export function ForkKnifeIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 2v7a3 3 0 003 3h1v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2c1.7 0 3 1.3 3 3v4c0 1.7-1.3 3-3 3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M17 2v8c0 2.8-2.2 5-5 5h0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M17 22v-8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function MusicIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 18V5l12-2v13" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={6} cy={18} r={3} stroke={color} strokeWidth={2} />
      <circle cx={18} cy={16} r={3} stroke={color} strokeWidth={2} />
    </svg>
  );
}

export function HourglassIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 3h14M5 3v4a7 7 0 004.9 6.7L12 16.3l2.1-2.6A7 7 0 0019 7V3" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M5 21h14M5 21v-4a7 7 0 014.9-6.7L12 7.7l2.1 2.6A7 7 0 0119 17v4" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M9 20h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function SpeechIcon({ size = 31, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}
