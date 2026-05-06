// src/pages/History.jsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listenFullHistory, deleteQueuesByIds, resetQueues } from '../firebase/queueService';
import { 
  CalendarIcon, 
  ChartBarIcon, 
  TableCellsIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function History() {
  const [queues, setQueues] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    return listenFullHistory(setQueues);
  }, []);

  // Group queues by date
  const groupedData = useMemo(() => {
    const groups = {};
    queues.forEach(q => {
      if (!q.createdAt) return;
      const date = q.createdAt.toDate().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(q);
    });
    return groups;
  }, [queues]);

  const dates = Object.keys(groupedData).sort((a, b) => {
    // Basic string sort works for DD/MM/YYYY in many locales but let's be careful
    return b.split('/').reverse().join('') - a.split('/').reverse().join('');
  });

  // Set initial selected date if not set
  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  const currentData = groupedData[selectedDate] || [];

  // Summary per table
  const summary = useMemo(() => {
    const stats = {};
    currentData.forEach(q => {
      if (q.assignedTable) {
        stats[q.assignedTable] = (stats[q.assignedTable] || 0) + 1;
      }
    });
    return stats;
  }, [currentData]);

  const activeTableNumbers = useMemo(() => {
    return Object.keys(summary).sort((a, b) => a - b);
  }, [summary]);

  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeData, setRangeData] = useState({ prefix: 'ALL', start: '', end: '', password: '' });

  const handleRangeDelete = async (e) => {
    e.preventDefault();
    if (rangeData.password !== '1212312121@Abc') return toast.error('รหัสผ่านไม่ถูกต้อง');
    if (!rangeData.start || !rangeData.end) return toast.error('กรุณาระบุเลขเริ่มต้นและสิ้นสุด');

    const startNum = parseInt(rangeData.start);
    const endNum = parseInt(rangeData.end);

    const idsToDelete = currentData.filter(q => {
      const qPrefix = q.number.charAt(0).toUpperCase();
      const qNum = parseInt(q.number.slice(1));
      
      const prefixMatch = rangeData.prefix === 'ALL' || qPrefix === rangeData.prefix;
      const rangeMatch = qNum >= startNum && qNum <= endNum;
      
      return prefixMatch && rangeMatch;
    }).map(q => q.id);

    if (idsToDelete.length === 0) return toast.error('ไม่พบข้อมูลคิวในช่วงที่ระบุ');

    if (window.confirm(`ยืนยันการลบคิวจำนวน ${idsToDelete.length} รายการ?`)) {
      const loading = toast.loading('กำลังลบข้อมูล...');
      try {
        await deleteQueuesByIds(idsToDelete);
        toast.success(`ลบข้อมูลสำเร็จ ${idsToDelete.length} รายการ`, { id: loading });
        setShowRangeModal(false);
        setRangeData({ prefix: 'ALL', start: '', end: '', password: '' });
      } catch (err) {
        console.error(err);
        toast.error('เกิดข้อผิดพลาด', { id: loading });
      }
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (resetPassword === '1212312121@Abc') {
      const loading = toast.loading(`กำลังลบข้อมูลประวัติวันที่ ${selectedDate}...`);
      try {
        const idsToDelete = currentData.map(q => q.id);
        
        // Check if selectedDate is today
        const todayStr = new Date().toLocaleDateString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        if (selectedDate === todayStr) {
          // If today, perform full reset (including tables)
          await resetQueues();
        } else {
          // If past date, just delete those records
          await deleteQueuesByIds(idsToDelete);
        }

        toast.success('ลบข้อมูลเรียบร้อยแล้ว', { id: loading });
        setShowResetModal(false);
        setResetPassword('');
        
        // If we deleted the only date, clear selection
        if (dates.length <= 1) {
          setSelectedDate(null);
        } else {
          // Move to next available date if current one is gone
          const currentIndex = dates.indexOf(selectedDate);
          const nextDate = dates[currentIndex + 1] || dates[currentIndex - 1];
          setSelectedDate(nextDate);
        }

      } catch(err) {
        console.error(err);
        toast.error('เกิดข้อผิดพลาด', { id: loading });
      }
    } else {
      toast.error('รหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-['Sarabun']">
      {/* Sidebar: Date List */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black text-slate-800">ประวัติย้อนหลัง</h1>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">เลือกวันที่ต้องการดู</span>
          {dates.length === 0 ? (
            <div className="p-8 text-center text-slate-300 italic">ไม่มีข้อมูลประวัติ</div>
          ) : (
            dates.map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${
                  selectedDate === date 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon className={`w-5 h-5 ${selectedDate === date ? 'text-blue-200' : 'text-slate-400'}`} />
                  <span className="font-bold">{date}</span>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  selectedDate === date ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {groupedData[date].length}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selectedDate ? (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8"
            >
              {/* Daily Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">ข้อมูลสรุปประจำวันที่ {selectedDate}</h2>
                  <p className="text-slate-500 font-medium">ภาพรวมการให้บริการแยกตามรายช่องบริการ</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowRangeModal(true)}
                    className="bg-amber-50 text-amber-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-amber-100 transition-all active:scale-95 border border-amber-100"
                  >
                    <TrashIcon className="w-5 h-5" />
                    <span>ลบคิวระบุช่วง</span>
                  </button>
                  <button 
                    onClick={() => setShowResetModal(true)}
                    className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-rose-100 transition-all active:scale-95 border border-rose-100"
                  >
                    <TrashIcon className="w-5 h-5" />
                    <span>ลบประวัติทั้งวัน</span>
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {activeTableNumbers.map(num => (
                  <div key={num} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <UserGroupIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">โต๊ะที่ {num}</span>
                    </div>
                    <div className="text-4xl font-black text-slate-800">{summary[num]}</div>
                    <div className="text-xs font-bold text-slate-400 italic">จำนวนคิวทั้งหมด</div>
                  </div>
                ))}
              </div>

              {/* Detailed Table */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                  <TableCellsIcon className="w-6 h-6 text-blue-500" />
                  <h3 className="font-black text-slate-800">รายละเอียดคิวรายบุคคล</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4">เวลา</th>
                        <th className="px-6 py-4">หมายเลขคิว</th>
                        <th className="px-6 py-4">ช่องบริการ</th>
                        <th className="px-6 py-4">หมายเหตุโต๊ะ</th>
                        <th className="px-6 py-4">ประเภท</th>
                        <th className="px-6 py-4">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentData.map(q => (
                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-500 text-sm">
                            {q.createdAt?.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </td>
                          <td className="px-6 py-4 font-black text-slate-800 text-lg">{q.number}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
                              ช่อง {q.assignedTable}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-500 italic">
                              {q.tableNote || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold ${q.paymentType === 'CASH' ? 'text-emerald-500' : 'text-orange-500'}`}>
                              {q.paymentType === 'CASH' ? 'เงินสด' : 'เงินโอน'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              q.status === 'completed' ? 'text-emerald-400' : 
                              q.status === 'skipped' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {q.status === 'completed' ? 'เสร็จสิ้น' : 
                               q.status === 'skipped' ? 'ข้ามคิว' : 
                               q.status === 'called' ? 'เรียกคิว' : 'รอรับบริการ'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <ChartBarIcon className="w-20 h-20 opacity-20" />
              <p className="font-bold text-lg">เลือกวันที่เพื่อดูข้อมูลสรุป</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Password Modal for Reset Queue */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowResetModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative z-10 shadow-2xl text-slate-800"
            >
              <button onClick={() => setShowResetModal(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-8">
                <TrashIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black mb-2">ยืนยันการลบข้อมูล</h2>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">กรุณาใส่รหัสผ่านเพื่อลบประวัติของวันที่ {selectedDate}</p>
              <form onSubmit={handleReset} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">รหัสผ่านยืนยัน</label>
                  <input type="password" autoFocus value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="รหัสผ่าน..." required />
                </div>
                <button type="submit" className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 active:scale-95">
                  ยืนยันการล้างข้อมูล
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Range Delete Modal */}
      <AnimatePresence>
        {showRangeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRangeModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 relative z-10 shadow-2xl text-slate-800"
            >
              <button onClick={() => setShowRangeModal(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-8">
                <TrashIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black mb-2">ลบคิวระบุช่วง</h2>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">ระบุประเภทและหมายเลขคิวที่ต้องการลบของวันที่ {selectedDate}</p>
              
              <form onSubmit={handleRangeDelete} className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">ตัวอักษรนำหน้า</label>
                    <select 
                      value={rangeData.prefix}
                      onChange={(e) => setRangeData({...rangeData, prefix: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                      <option value="ALL">ทั้งหมด</option>
                      <option value="Q">Q (Unified)</option>
                      <option value="C">C (Cash)</option>
                      <option value="T">T (Transfer)</option>
                    </select>
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">ตั้งแต่หมายเลข</label>
                    <input 
                      type="number" 
                      value={rangeData.start}
                      onChange={(e) => setRangeData({...rangeData, start: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="เช่น 1"
                      required
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">ถึงหมายเลข</label>
                    <input 
                      type="number" 
                      value={rangeData.end}
                      onChange={(e) => setRangeData({...rangeData, end: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="เช่น 10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">รหัสผ่านยืนยัน</label>
                  <input 
                    type="password" 
                    value={rangeData.password}
                    onChange={(e) => setRangeData({...rangeData, password: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="รหัสผ่าน..."
                    required
                  />
                </div>

                <button type="submit" className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 active:scale-95">
                  ยืนยันการลบช่วงคิว
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
