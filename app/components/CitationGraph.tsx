"use client";

import Link from "next/link";
import type { CaseTreatment } from "../lib/contract";

type Props = {
  centerId: string;
  outgoing: CaseTreatment[];
  incoming: CaseTreatment[];
};

const TREATMENT_COLOR: Record<string, string> = {
  followed: "var(--verdict-green)",
  followed_with_limits: "var(--verdict-green)",
  strengthened: "var(--verdict-green)",
  distinguished: "var(--citation-blue)",
  cited_for_context: "var(--muted-grey)",
  weakened: "var(--case-gold)",
  overturned: "var(--dispute-red)",
  rejected_as_irrelevant: "var(--muted-grey)",
};

export function CitationGraph({ centerId, outgoing, incoming }: Props) {
  const width = 640;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2;

  const outNodes = outgoing.map((t) => ({ ...t, otherId: t.old_case_id }));
  const inNodes = incoming.map((t) => ({ ...t, otherId: t.new_case_id }));

  const radius = 150;

  // Deterministic layout: outgoing treatments on the right, incoming on the left.
  const outPositioned = outNodes.map((n, i) => ({
    ...n,
    x: cx + radius,
    y: cy - radius + ((2 * radius) / Math.max(outNodes.length + 1, 2)) * (i + 1),
  }));
  const inPositioned = inNodes.map((n, i) => ({
    ...n,
    x: cx - radius,
    y: cy - radius + ((2 * radius) / Math.max(inNodes.length + 1, 2)) * (i + 1),
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {outPositioned.map((n) => (
        <line
          key={`out-line-${n.old_case_id}`}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke={TREATMENT_COLOR[n.treatment] ?? "var(--muted-grey)"}
          strokeWidth={1.5}
          opacity={0.7}
        />
      ))}
      {inPositioned.map((n) => (
        <line
          key={`in-line-${n.new_case_id}`}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke={TREATMENT_COLOR[n.treatment] ?? "var(--muted-grey)"}
          strokeWidth={1.5}
          opacity={0.7}
          strokeDasharray="4 3"
        />
      ))}

      <circle cx={cx} cy={cy} r={26} fill="var(--case-gold)" opacity={0.9} />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={11}
        fontFamily="var(--font-mono)"
        fill="var(--ink-black)"
      >
        {centerId}
      </text>

      {outPositioned.map((n) => (
        <g key={`out-${n.old_case_id}`}>
          <circle cx={n.x} cy={n.y} r={16} fill="var(--archive-charcoal)" stroke={TREATMENT_COLOR[n.treatment]} strokeWidth={1.5} />
          <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--legal-paper)">
            {n.old_case_id.replace("CASE_", "#")}
          </text>
        </g>
      ))}
      {inPositioned.map((n) => (
        <g key={`in-${n.new_case_id}`}>
          <circle cx={n.x} cy={n.y} r={16} fill="var(--archive-charcoal)" stroke={TREATMENT_COLOR[n.treatment]} strokeWidth={1.5} />
          <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--legal-paper)">
            {n.new_case_id.replace("CASE_", "#")}
          </text>
        </g>
      ))}
    </svg>
  );
}
