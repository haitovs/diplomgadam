import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export default function ErrorState({ message, action, actionLabel = "Retry" }: ErrorStateProps) {
  return (
    <div className="glass-panel p-8 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10">
        <AlertTriangle className="w-6 h-6 text-rose-500" />
      </div>
      <p className="text-slate-600 dark:text-slate-300 font-medium">{message}</p>
      {action && (
        <button
          className="px-5 py-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-700 dark:from-brand-600 dark:to-brand-500 text-white text-sm font-semibold hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
          onClick={action}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
