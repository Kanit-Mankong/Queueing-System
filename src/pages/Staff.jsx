// src/pages/Staff.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  listenQueuesForTable, 
  listenTables, 
  requestQueue, 
  callNextQueue, 
  skipQueue, 
  completeQueue,
  recallSkipped,
  recallQueue,
  listenSystemSettings
} from '../firebase/queueService';

import { toast } from 'react-hot-toast';
import { 
  PlayIcon, 
  ForwardIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';

// TABLE_LABELS is now dynamic based on Firestore settings

export default function Staff() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [queues, setQueues] = useState([]);
  const [tables, setTables] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ assignmentMode: 'immediate' });


  useEffect(() => {
    // Force Dark Theme for Staff Portal
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  useEffect(() => {
    const unsubTables = listenTables(setTables);
    const unsubSettings = listenSystemSettings(setSystemSettings);
    return () => {
      unsubTables();
      unsubSettings();
    };
  }, []);


  useEffect(() => {
    if (!selectedTable) return;
    const tableData = tables.find(t => t.tableNumber === selectedTable);
    if (!tableData) return;

    const unsubQ = listenQueuesForTable(
      selectedTable, 
      tableData.type, 
      systemSettings.assignmentMode, 
      setQueues
    );
    return () => unsubQ();
  }, [selectedTable, tables, systemSettings.assignmentMode]);


  if (!selectedTable) {
    return (
      <div className="min-h-screen p-4 md:p-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#060912]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">ระบบเจ้าหน้าที่</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm">กรุณาเลือกช่องบริการ</p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 max-w-6xl w-full">
          {tables.map((table) => (
            <button
              key={table.tableNumber}
              onClick={() => setSelectedTable(table.tableNumber)}
              className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-row sm:flex-col items-center gap-4 md:gap-6 hover:ring-4 hover:ring-blue-500/20 transition-all duration-300 group shadow-lg text-left sm:text-center"
            >
              <div className="text-4xl md:text-6xl">
                {table.type === 'CASH' ? '💵' : '📱'}
              </div>
              <div>
                <div className="text-xl md:text-3xl font-black text-slate-800 dark:text-white mb-1">ช่อง {table.tableNumber}</div>
                <div className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-tight">
                  {table.type === 'CASH' ? 'รับชำระ (เงินสด)' : 'รับชำระ (เงินโอน)'}
                </div>
                {table.note && (
                  <div className="text-[9px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
                    {table.note}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tableData = tables.find((t) => t.tableNumber === selectedTable);
  const currentQueue = queues.find((q) => q.id === tableData?.currentQueueId);
  const waitingCount = queues.filter((q) => q.status === 'waiting').length;
  const skippedQueues = queues.filter((q) => q.status === 'skipped');

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-[#060912]">
      <div className="max-w-4xl mx-auto flex flex-col gap-6 md:gap-8">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setSelectedTable(null)} className="w-10 h-10 md:w-12 md:h-12 glass rounded-xl flex items-center justify-center text-slate-500">
              ←
            </button>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white">ช่อง {selectedTable}</h2>
              <p className="text-[10px] md:text-sm font-bold text-blue-600 dark:text-blue-400">
                {tableData?.type === 'CASH' ? 'รับชำระ (เงินสด)' : 'รับชำระ (เงินโอน)'}
                {tableData?.note && ` - ${tableData.note}`}
              </p>
            </div>
          </div>
          <div className="px-4 py-2 md:px-6 md:py-2 glass rounded-xl border-blue-500/20 border whitespace-nowrap">
            <span className="text-xs md:text-sm font-bold text-slate-500 mr-2">รอ:</span>
            <span className="text-lg md:text-xl font-black text-blue-600">{waitingCount}</span>
          </div>
        </div>

        {/* Current Serving Card */}
        <div className="glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col items-center gap-6 md:gap-10 shadow-2xl relative overflow-hidden border-emerald-500/10 border">
          {!currentQueue ? (
            <div className="text-center py-12 md:py-20">
              <div className="text-6xl md:text-8xl mb-6 grayscale opacity-20">🛋️</div>
              <p className="text-lg md:text-2xl font-black text-slate-300 dark:text-slate-700 italic">พร้อมให้บริการ...</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <span className="text-[10px] md:text-sm font-black text-emerald-500 uppercase tracking-[0.3em] md:tracking-[0.5em] mb-2 md:mb-4 block">กำลังเรียกคิว</span>
                <div className="text-7xl md:text-[10rem] font-black text-slate-800 dark:text-white leading-none tracking-tighter">
                  {currentQueue.number}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 md:gap-6 w-full">
                <ControlButton 
                  icon={<ArrowPathIcon />} 
                  label="เรียกซ้ำ" 
                  color="bg-amber-500" 
                  onClick={() => {
                    recallQueue(currentQueue.id, selectedTable);
                    toast.success(`เรียกหมายเลข ${currentQueue.number} ซ้ำ`);
                  }} 
                />
                <ControlButton 
                  icon={<ForwardIcon />} 
                  label="ข้าม" 
                  color="bg-rose-500" 
                  onClick={() => {
                    skipQueue(currentQueue.id, selectedTable);
                    toast.error(`ข้ามหมายเลข ${currentQueue.number} แล้ว`);
                  }} 
                />
                <ControlButton 
                  icon={<CheckCircleIcon />} 
                  label="เสร็จสิ้น" 
                  color="bg-emerald-500" 
                  onClick={() => {
                    completeQueue(currentQueue.id, selectedTable);
                    toast.success(`หมายเลข ${currentQueue.number} รับบริการเสร็จสิ้น`);
                  }} 
                />
              </div>
            </>
          )}

          {/* Large Action Button */}
          {!currentQueue && (
            <button
              onClick={() => {
                callNextQueue(selectedTable, queues);
                toast.success('กำลังเรียกคิวถัดไป...', { icon: '📢' });
              }}
              disabled={waitingCount === 0}
              className="w-full py-6 md:py-8 rounded-[1.5rem] md:rounded-[2rem] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white flex items-center justify-center gap-3 md:gap-4 text-xl md:text-3xl font-black transition-all shadow-xl shadow-blue-600/20"
            >
              <PlayIcon className="w-6 h-6 md:w-10 md:h-10" />
              เรียกคิวถัดไป
            </button>
          )}
        </div>

        {/* Skipped List */}
        {skippedQueues.length > 0 && (
          <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <ExclamationCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
              <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-white">คิวที่ถูกข้าม</h3>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4">
              {skippedQueues.map((q) => (
                <button
                  key={q.id}
                  onClick={() => recallSkipped(q.id, selectedTable)}
                  className="px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl glass border-rose-500/10 border hover:bg-rose-500/10 transition-all flex items-center gap-2 md:gap-3 group"
                >
                  <span className="text-lg md:text-xl font-black text-slate-800 dark:text-white">{q.number}</span>
                  <ArrowPathIcon className="w-4 h-4 text-rose-500 group-hover:rotate-180 transition-transform duration-500" />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ControlButton({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 rounded-xl md:rounded-[1.5rem] ${color} text-white hover:scale-105 transition-all shadow-lg active:scale-95`}
    >
      <div className="w-6 h-6 md:w-10 md:h-10">{icon}</div>
      <span className="font-black text-[10px] md:text-sm">{label}</span>
    </button>
  );
}
