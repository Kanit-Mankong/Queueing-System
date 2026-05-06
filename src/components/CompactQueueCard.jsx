// src/components/CompactQueueCard.jsx
import { motion, AnimatePresence } from 'framer-motion';

export default function CompactQueueCard({ tableNumber, currentQueue, previousQueue, tableType }) {
  const isIdle = !currentQueue;
  
  // Color logic based on tableType
  const isCash = tableType === 'CASH';
  const colorClasses = isCash 
    ? 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 border-emerald-300'
    : 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 border-blue-300';
    
  const glowColor = isCash ? 'rgba(16, 185, 129, 0.6)' : 'rgba(59, 130, 246, 0.6)';
  const secondaryColor = isCash ? 'text-emerald-100' : 'text-blue-100';

  return (
    <motion.div 
      layout
      key={!isIdle ? currentQueue.id : 'idle'}
      initial={!isIdle ? { scale: 0.95, opacity: 0, filter: 'brightness(2)' } : {}}
      animate={!isIdle ? {
        opacity: 1,
        filter: ['brightness(1.5)', 'brightness(1)', 'brightness(1.1)', 'brightness(1)'],
        boxShadow: [
          `0 0 20px ${glowColor.replace('0.6', '0.3')}`,
          `0 0 40px ${glowColor}`,
          `0 0 20px ${glowColor.replace('0.6', '0.3')}`
        ]
      } : { opacity: 1, scale: 1 }}
      transition={!isIdle ? {
        duration: 0.8,
        filter: { duration: 1 },
        boxShadow: { repeat: Infinity, duration: 2 }
      } : { duration: 0.5 }}
      className={`rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-5 flex flex-col transition-all duration-500 h-full border relative overflow-hidden ${
        !isIdle 
          ? `${colorClasses} z-50` 
          : 'bg-white border-slate-100 z-10'
      }`}
    >
      {/* Modern Shimmer Effect */}
      {!isIdle && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 z-20 pointer-events-none"
        />
      )}

      {/* Background Glow for Active */}
      {!isIdle && (
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/30 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-1 md:mb-2 relative z-10">
        <h3 className={`text-[12px] md:text-2xl lg:text-3xl font-black tracking-tight whitespace-nowrap ${
          !isIdle ? 'text-white' : 'text-slate-800'
        }`}>
          ช่องบริการ {tableNumber}
        </h3>
        {!isIdle && (
          <motion.div
            animate={{ 
              backgroundColor: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)'],
              scale: [1, 1.05, 1]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-white/30 backdrop-blur-md flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse" />
            <span className="text-[7px] md:text-[10px] font-black text-white uppercase tracking-widest">
              {isCash ? 'เงินสด' : 'เงินโอน'}
            </span>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-1">
        <AnimatePresence mode="wait">
          {!isIdle ? (
            <motion.div
              key={currentQueue.id}
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex flex-col items-center justify-center w-full"
            >
              <div className="text-[12vmin] md:text-7xl lg:text-8xl font-black tracking-tighter leading-none text-white drop-shadow-2xl">
                {currentQueue.number}
              </div>
              <div className={`text-[8px] md:text-xs font-black uppercase tracking-[0.2em] mt-1 ${secondaryColor}`}>
                {isCash ? 'ชำระเงินสด' : 'โอนเงิน'}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(4px)' }}
              className="flex flex-col items-center justify-center"
            >
              <div className="text-[5vmin] md:text-3xl lg:text-4xl font-black tracking-tighter text-slate-300 italic">
                พร้อมให้บริการ
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History / Previous Queue */}
      <div className={`mt-1 md:mt-2 pt-1 md:pt-2 border-t flex flex-col gap-0.5 ${
        !isIdle ? 'border-white/20' : 'border-slate-100'
      }`}>
        <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest ${
          !isIdle ? `${secondaryColor}/60` : 'text-slate-400'
        }`}>คิวก่อนหน้า (History)</span>
        <div className="flex items-center gap-2">
          {previousQueue ? (
            <span className={`text-[10px] md:text-lg font-black ${
              !isIdle ? 'text-white' : 'text-slate-400'
            }`}>{previousQueue.number}</span>
          ) : (
            <span className={`text-[8px] md:text-xs font-bold italic ${
              !isIdle ? `${secondaryColor}/30` : 'text-slate-200'
            }`}>ไม่มีข้อมูล</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
