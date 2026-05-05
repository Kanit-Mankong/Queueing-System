// src/components/QueueCard.jsx
import { motion, AnimatePresence } from 'framer-motion';

export default function QueueCard({ tableNumber, currentQueue }) {
  const isIdle = !currentQueue;

  return (
    <div className={`glass rounded-[2.5rem] p-8 flex flex-col transition-all duration-500 min-h-[450px] shadow-2xl relative overflow-hidden ${
      !isIdle ? 'ring-8 ring-emerald-500/20' : ''
    }`}>
      {/* Background glow when active */}
      {!isIdle && (
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-center mb-8 relative z-10">
        <h3 className="text-5xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>
          ช่องบริการ {tableNumber}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          {!isIdle ? (
            <motion.div
              key={currentQueue.id}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center w-full"
            >
              <div className="text-8xl font-black tracking-tighter leading-none mb-6" style={{ color: 'var(--text-primary)' }}>
                {currentQueue.number}
              </div>
              <div className="flex items-center gap-4 px-8 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600"></span>
                </span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-wide">กำลังเรียกคิว</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center opacity-60"
            >
              <div className="text-6xl font-black tracking-tighter mb-4 italic" style={{ color: 'var(--text-secondary)' }}>
                WAITING
              </div>
              <span className="text-xl font-bold text-slate-500 uppercase tracking-[0.3em]">ว่าง</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Decoration */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
