export function AgreementTextViewer({ text }: { text: string }) {
  return (
    <div className="citation-line pt-3">
      <p className="text-sm text-parchment/90 leading-relaxed whitespace-pre-wrap font-display">
        {text}
      </p>
    </div>
  );
}
