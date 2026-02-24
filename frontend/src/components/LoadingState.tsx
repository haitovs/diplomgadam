import { motion } from "framer-motion";

interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-brand-500/20 dark:border-brand-400/20"
        />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 dark:border-t-brand-400"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-2xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          🍽️
        </motion.span>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">{label}</p>
    </div>
  );
}
