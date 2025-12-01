export default function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="glass-panel p-6 text-center text-slate-500 animate-pulse">
      {label}
    </div>
  );
}
