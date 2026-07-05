const OBLIGATION_MARKERS = [
  "must",
  "shall",
  "agrees to",
  "required to",
  "will",
  "should",
  "deliver",
  "include",
  "provide",
  "submit",
  "allow",
  "release",
  "essential",
  "core",
  "condition",
];

function extractObligations(text: string): string[] {
  const sentences = text
    .split(/(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const obligations = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return OBLIGATION_MARKERS.some((marker) => lower.includes(marker));
  });

  return obligations.length > 0 ? obligations : sentences.slice(0, 3);
}

export function ObligationLens({ agreementText }: { agreementText: string }) {
  const obligations = extractObligations(agreementText);

  return (
    <div className="border border-line/40 rounded-sm p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-2">
        Obligation Lens
      </p>
      <p className="text-[11px] text-muted mb-3 italic">
        Extracted client-side for readability. Does not decide the case.
      </p>
      <ul className="space-y-2">
        {obligations.map((o, i) => (
          <li key={i} className="text-sm text-parchment/90 flex gap-2">
            <span className="text-gold font-mono">{`0${i + 1}`.slice(-2)}</span>
            <span>{o}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
