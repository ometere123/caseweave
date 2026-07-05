export function HoldingPanel({
  holding,
  reasoningRule,
}: {
  holding: string;
  reasoningRule?: string;
}) {
  return (
    <div className="border border-gold/40 bg-gold/5 rounded-sm p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-2">
        Holding
      </p>
      <p className="font-display text-paper leading-relaxed">{holding}</p>
      {reasoningRule && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted mt-4 mb-1">
            Reasoning rule
          </p>
          <p className="text-sm text-parchment/90 leading-relaxed">
            {reasoningRule}
          </p>
        </>
      )}
    </div>
  );
}
