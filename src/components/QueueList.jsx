// src/components/QueueList.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { FACULTY_LABELS } from '../firebase/queueService';

const STATUS_STYLES = {
  waiting:   'badge-waiting',
  called:    'badge-called',
  skipped:   'badge-skipped',
  completed: 'badge-completed',
};

const STATUS_LABELS = {
  waiting:   'รอเรียก',
  called:    'กำลังเรียก',
  skipped:   'ข้ามไปแล้ว',
  completed: 'เสร็จสิ้น',
};

const STATUS_ICONS = {
  waiting:   '⏳',
  called:    '🔔',
  skipped:   '⏭',
  completed: '✅',
};

export default function QueueList({
  queues = [],
  title,
  emptyText = 'ไม่มีรายการ',
  actions,
  showFaculty = false,
  maxHeight = 'max-h-72',
  compact = false,
}) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            {title}
          </h3>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {queues.length}
          </span>
        </div>
      )}

      <div className={`${maxHeight} overflow-y-auto pr-1 flex flex-col gap-1.5`}>
        <AnimatePresence mode="popLayout">
          {queues.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-slate-600 text-sm"
            >
              {emptyText}
            </motion.div>
          ) : (
            queues.map((queue) => (
              <motion.div
                key={queue.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{    opacity: 0, x:  12, height: 0 }}
                transition={{ duration: 0.25 }}
                className={`
                  glass border border-white/5 rounded-xl
                  flex items-center justify-between gap-3
                  ${compact ? 'px-3 py-2' : 'px-4 py-3'}
                  hover:border-white/10 transition-colors duration-200
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono-num font-bold text-white text-lg leading-none shrink-0">
                    {queue.number}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {showFaculty && (
                      <span className="text-xs text-slate-500 truncate">
                        {FACULTY_LABELS[queue.faculty] || queue.faculty}
                      </span>
                    )}
                    {queue.assignedTable && (
                      <span className="text-xs text-slate-600">
                        ช่องบริการ {queue.assignedTable}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`${STATUS_STYLES[queue.status]} text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                    <span>{STATUS_ICONS[queue.status]}</span>
                    <span className="capitalize">{STATUS_LABELS[queue.status]}</span>
                  </span>
                  {actions && actions(queue)}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
