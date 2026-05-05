// src/pages/Scanner.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { queuesRef, FACULTY_LABELS } from '../firebase/queueService';
import { 
  QrCodeIcon, 
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Scanner() {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Keep focus on input for barcode scanner
    const interval = setInterval(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!ticketId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Barcode scanners usually scan the document ID or a specific format
      // Here we assume the scanned value is the Firestore Document ID
      const docRef = doc(db, 'queues', ticketId.trim());
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        setResult({ id: snap.id, ...snap.data() });
        setTicketId(''); // Clear for next scan
      } else {
        setError('ไม่พบข้อมูลบัตรคิวนี้ในระบบ');
      }
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060912] text-white p-6 md:p-10 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => navigate('/')}
            className="w-12 h-12 glass-dark rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <div className="text-right">
            <h1 className="text-2xl font-black tracking-tight">เครื่องตรวจสอบบัตรคิว</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Scanner Mode</p>
          </div>
        </div>

        {/* Scan Input (Hidden but active) */}
        <form onSubmit={handleScan} className="mb-12">
          <div className="relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="w-6 h-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="สแกน QR หรือพิมพ์รหัสบัตรคิว..."
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-xl font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-600"
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
              <QrCodeIcon className="w-8 h-8 text-slate-500 animate-pulse" />
            </div>
          </div>
        </form>

        {/* Status / Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-bold">กำลังตรวจสอบข้อมูล...</p>
            </motion.div>
          )}

          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="glass-dark border-rose-500/20 bg-rose-500/5 p-10 rounded-[3rem] text-center"
            >
              <XCircleIcon className="w-20 h-20 text-rose-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black mb-2">ตรวจสอบไม่สำเร็จ</h2>
              <p className="text-slate-400 font-medium">{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="glass-dark border-blue-500/20 bg-blue-500/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                <CheckCircleIcon className="w-12 h-12 text-emerald-500 opacity-50" />
              </div>

              <div className="text-center mb-10">
                <span className="text-sm font-black text-blue-500 uppercase tracking-[0.3em] mb-4 block">พบข้อมูลคิว</span>
                <div className="text-[8rem] font-black leading-none tracking-tighter mb-2">
                  {result.number}
                </div>
                <div className="text-slate-400 font-medium">ID: {result.id}</div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                  <div className={`p-4 rounded-xl ${result.faculty === 'ALL' ? 'bg-amber-500/20 text-amber-500' : 'bg-purple-500/20 text-purple-500'}`}>
                    {result.faculty === 'ALL' ? <BanknotesIcon className="w-8 h-8" /> : <CreditCardIcon className="w-8 h-8" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">ประเภทการชำระเงิน</div>
                    <div className="text-xl font-black">
                      {result.faculty === 'ALL' ? 'จ่ายเงินสด (Cash)' : 'จ่ายเงินโอน (Transfer)'}
                    </div>
                  </div>
                </div>

                {result.faculty !== 'ALL' && (
                  <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                    <div className="p-4 rounded-xl bg-blue-500/20 text-blue-500">
                      <MagnifyingGlassIcon className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">คณะ/หน่วยงาน</div>
                      <div className="text-xl font-black">
                        {FACULTY_LABELS[result.faculty] || result.faculty}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-4 rounded-xl bg-slate-500/20 text-slate-400">
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-lg">!</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">สถานะคิว</div>
                    <div className={`text-xl font-black uppercase ${
                      result.status === 'waiting' ? 'text-blue-400' : 
                      result.status === 'called' ? 'text-amber-400' : 
                      'text-emerald-400'
                    }`}>
                      {result.status === 'waiting' ? 'รอเรียก' : 
                       result.status === 'called' ? `กำลังเรียกที่ช่อง ${result.assignedTable}` : 
                       'เสร็จสิ้นแล้ว'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && !error && (
          <div className="text-center py-20 opacity-30">
            <QrCodeIcon className="w-24 h-24 mx-auto mb-6" />
            <p className="text-xl font-bold">พร้อมสำหรับการแสกน</p>
          </div>
        )}
      </div>
    </div>
  );
}
