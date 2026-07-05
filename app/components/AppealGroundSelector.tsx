import { ALLOWED_APPEAL_GROUNDS } from "../lib/contract";

export function AppealGroundSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
    >
      <option value="">Select appeal ground…</option>
      {ALLOWED_APPEAL_GROUNDS.map((ground) => (
        <option key={ground} value={ground}>
          {ground.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
