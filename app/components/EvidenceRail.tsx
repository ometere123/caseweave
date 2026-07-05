export function EvidenceRail({ urls, label }: { urls: string[]; label: string }) {
  if (urls.length === 0) {
    return <p className="text-xs text-muted italic">No evidence submitted.</p>;
  }
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted mb-2">
        {label}
      </p>
      <ul className="space-y-1">
        {urls.map((url) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-citation hover:underline break-all"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
