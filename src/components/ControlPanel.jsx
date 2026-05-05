// src/components/ControlPanel.jsx
import { motion } from 'framer-motion';
import {
  PhoneArrowUpRightIcon,
  ForwardIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

export default function ControlPanel({
  tableNumber,
  currentQueue,
  waitingCount,
  skippedCount,
  onCallNext,
  onSkip,
  onComplete,
  isLoading,
}) {
  const hasActive = !!currentQueue;

  return (
    <div className="glass border border-white/8 rounded-2xl p-5 flex flex-col gap-5">
      <div className="text-center py-4 border-b border-white/5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
          กำลังให้บริการ — ช่อง {tableNumber}
        </p>

        <motion.div
          key={currentQueue?.id || 'idle'}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          {currentQueue ? (
            <>
              <span className="font-mono-num font-black text-8xl text-white leading-none">
                {currentQueue.number}
              </span>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                กำลังดำเนินการ
              </div>
            </>
          ) : (
            <span className="font-mono-num font-black text-7xl text-white/10 leading-none">
              ─ ─ ─
            </span>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass border border-white/5 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-black font-mono-num text-white">{waitingCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">รอเรียก</p>
        </div>
        <div className="glass border border-red-500/20 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-black font-mono-num text-red-400">{skippedCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">ข้ามไปแล้ว</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCallNext}
          disabled={isLoading || waitingCount === 0}
          className={`
            flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-sm
            transition-all duration-200
            ${waitingCount > 0
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
              : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }
          `}
        >
          <PhoneArrowUpRightIcon className="w-4 h-4" />
          เรียกคิวถัดไป
        </motion.button>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => hasActive && onSkip(currentQueue.id)}
            disabled={isLoading || !hasActive}
            className={`
              flex items-center justify-center gap-1.5 rounded-xl py-3 font-semibold text-sm
              transition-all duration-200
              ${hasActive
                ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-red-400 hover:from-red-500/30 hover:to-red-600/30'
                : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
              }
            `}
          >
            <ForwardIcon className="w-4 h-4" />
            ข้ามคิว
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => hasActive && onComplete(currentQueue.id)}
            disabled={isLoading || !hasActive}
            className={`
              flex items-center justify-center gap-1.5 rounded-xl py-3 font-semibold text-sm
              transition-all duration-200
              ${hasActive
                ? 'bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:from-indigo-500/30 hover:to-indigo-600/30'
                : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
              }
            `}
          >
            <CheckCircleIcon className="w-4 h-4" />
            เสร็จสิ้น
          </motion.button>
        </div>
      </div>
    </div>
  );
}
