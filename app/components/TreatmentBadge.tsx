const STYLES: Record<string, string> = {
  followed: "text-verdict border-verdict/60 bg-verdict/10",
  followed_with_limits: "text-verdict border-verdict/60 bg-verdict/10",
  strengthened: "text-verdict border-verdict/60 bg-verdict/10",
  distinguished: "text-citation border-citation/60 bg-citation/10",
  cited_for_context: "text-muted border-muted/60 bg-muted/10",
  weakened: "text-gold border-gold/60 bg-gold/10",
  overturned: "text-dispute border-dispute/60 bg-dispute/10",
  rejected_as_irrelevant: "text-muted border-muted/60 bg-muted/10",
};

export function TreatmentBadge({ treatment }: { treatment: string }) {
  const style = STYLES[treatment] ?? "text-muted border-muted/60 bg-muted/10";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[11px] font-mono uppercase tracking-wide ${style}`}
    >
      {treatment.replace(/_/g, " ")}
    </span>
  );
}
