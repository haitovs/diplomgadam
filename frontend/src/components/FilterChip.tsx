interface FilterChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

export default function FilterChip({ label, active, onToggle }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full border text-sm transition ${
        active ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-600 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );
}
