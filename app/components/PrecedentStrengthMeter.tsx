function bandLabel(strength: number) {
  if (strength <= 20) return "weak";
  if (strength <= 40) return "persuasive";
  if (strength <= 60) return "useful";
  if (strength <= 80) return "strong";
  return "foundational";
}

export function PrecedentStrengthMeter({ strength }: { strength: number }) {
  const pct = Math.max(0, Math.min(100, strength));
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-line/30 overflow-hidden">
        <div
          className="h-full bg-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted">
        {pct} · {bandLabel(pct)}
      </span>
    </div>
  );
}
