interface ErrorStateProps {
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export default function ErrorState({ message, action, actionLabel = "Retry" }: ErrorStateProps) {
  return (
    <div className="glass-panel p-6 text-center space-y-3">
      <p className="text-slate-500">{message}</p>
      {action && (
        <button
          className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold"
          onClick={action}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
