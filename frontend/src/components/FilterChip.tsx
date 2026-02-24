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
      className={`px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white border-brand-600 shadow-md shadow-brand-500/25 scale-[1.03]"
          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-300 hover:scale-[1.03]"
      }`}
    >
      {label}
    </button>
  );
}
