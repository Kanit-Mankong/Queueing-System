import { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  listenTables, 
  addTable, 
  deleteTable, 
  updateTable, 
  listenSystemSettings, 
  updateSystemSettings,
  listenAudioFiles,
  listenDashboardSettings,
  updateDashboardSettings
} from '../firebase/queueService';


import { 
  PlusIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
  ChatBubbleBottomCenterTextIcon,
  HashtagIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  ListBulletIcon,
  Squares2X2Icon,
  SpeakerWaveIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  ExclamationCircleIcon,
  PrinterIcon,
  TvIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';



import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ── Audio slot definitions ────────────────────────────────────────────────────
const PHRASE_SLOTS = [
  { key: 'phrase_invite',  label: 'เชิญหมายเลข',         hint: 'ประโยคเปิด เช่น "เชิญหมายเลข"' },
  { key: 'letter_q',      label: 'Q (คิว)',                hint: 'เสียงอ่านตัวอักษร "Q" หรือ "คิว"' },
  { key: 'letter_c',      label: 'C (ซี)',                 hint: 'เสียงอ่านตัวอักษร "C" หรือ "ซี"' },
  { key: 'letter_t',      label: 'T (ที)',                 hint: 'เสียงอ่านตัวอักษร "T" หรือ "ที"' },
  { key: 'phrase_counter', label: 'ที่ช่องบริการ',         hint: 'ประโยคกลาง เช่น "ที่ช่องบริการ"' },
  { key: 'phrase_end',     label: 'ลงท้าย (ค่ะ / ครับ)',  hint: 'คำลงท้าย เช่น "ค่ะ" หรือ "ครับ"' },
];
const DIGIT_SLOTS = [0,1,2,3,4,5,6,7,8,9].map(n => ({
  key: `digit_${n}`,
  label: `${n}`,
  hint: `เสียงอ่านตัวเลข "${n}"`,
}));


export default function Settings() {
  const [tables, setTables] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ tableNumber: '', type: 'CASH', note: '' });
  const [systemSettings, setSystemSettings] = useState({ assignmentMode: 'immediate', numberingMode: 'unified' });
  const [audioFiles, setAudioFiles] = useState({});
  const [uploading, setUploading] = useState({}); // { [slot]: progress 0-100 }
  const [dashboardSettings, setDashboardSettings] = useState({ videoRatio: 55 });
  const [printConfig, setPrintConfig] = useState(() => {
    const saved = localStorage.getItem('printConfig');
    return saved ? JSON.parse(saved) : { mode: 'standard', paper: '80', scale: 100 };
  });
  const fileInputRefs = useRef({});


  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubTables = listenTables(setTables);
    const unsubSettings = listenSystemSettings(setSystemSettings);
    const unsubAudio = listenAudioFiles(setAudioFiles);
    const unsubDash = listenDashboardSettings((data) => {
      if (data && typeof data.videoRatio === 'number') {
        setDashboardSettings(prev => ({ ...prev, videoRatio: data.videoRatio }));
      }
    });
    return () => {
      unsubTables();
      unsubSettings();
      unsubAudio();
      unsubDash();
    };
  }, []);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tableNumber) return toast.error('กรุณาระบุเลขโต๊ะ');
    
    try {
      if (editingTable) {
        // Update
        await updateTable(formData.tableNumber, { type: formData.type, note: formData.note });
        toast.success('อัปเดตข้อมูลเรียบร้อยแล้ว');
      } else {
        // Add
        // Check if table number already exists
        if (tables.find(t => t.tableNumber === parseInt(formData.tableNumber))) {
          return toast.error('เลขโต๊ะนี้มีอยู่แล้วในระบบ');
        }
        await addTable(formData);
        toast.success('เพิ่มโต๊ะเรียบร้อยแล้ว');
      }
      setShowModal(false);
      setFormData({ tableNumber: '', type: 'CASH', note: '' });
      setEditingTable(null);
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const openAdd = () => {
    setEditingTable(null);
    setFormData({ tableNumber: '', type: 'CASH', note: '' });
    setShowModal(true);
  };

  const openEdit = (table) => {
    setEditingTable(table);
    setFormData({ tableNumber: table.tableNumber, type: table.type, note: table.note });
    setShowModal(true);
  };

  const handleDelete = async (tableNumber) => {
    if (window.confirm(`ยืนยันการลบโต๊ะที่ ${tableNumber}?`)) {
      try {
        await deleteTable(tableNumber);
        toast.success('ลบโต๊ะเรียบร้อยแล้ว');
      } catch (err) {
        console.error(err);
        toast.error('เกิดข้อผิดพลาดในการลบโต๊ะ');
      }
    }
  };

  const handleToggleMode = async (mode) => {
    try {
      await updateSystemSettings({ assignmentMode: mode });
      toast.success(`เปลี่ยนโหมดเป็น: ${mode === 'immediate' ? 'จัดสรรทันที' : 'จัดสรรเมื่อเรียก'}`);
    } catch (err) {
      toast.error('ไม่สามารถเปลี่ยนโหมดได้');
    }
  };

  const handleToggleNumberingMode = async (mode) => {
    try {
      await updateSystemSettings({ numberingMode: mode });
      toast.success(`เปลี่ยนรูปแบบเลขคิวเป็น: ${mode === 'unified' ? 'เลขชุดเดียว (Q)' : 'แยกตามประเภท (C/T)'}`);
    } catch (err) {
      toast.error('ไม่สามารถเปลี่ยนรูปแบบเลขคิวได้');
    }
  };

  const handleUpdateDashboardLayout = async (ratio) => {
    setDashboardSettings(prev => ({ ...prev, videoRatio: ratio }));
    try {
      await updateDashboardSettings({ videoRatio: ratio });
    } catch (err) {
      toast.error('ไม่สามารถบันทึกการตั้งค่าเลย์เอาต์ได้');
    }
  };

  const updatePrintConfig = (key, value) => {
    const newConfig = { ...printConfig, [key]: value };
    setPrintConfig(newConfig);
    localStorage.setItem('printConfig', JSON.stringify(newConfig));
    toast.success('อัปเดตการตั้งค่าเครื่องพิมพ์แล้ว');
  };

  const testPlay = (url) => {
    const audio = new Audio(url);
    audio.play().catch(e => {
      console.error("Playback failed:", e);
      toast.error("ไม่สามารถเล่นไฟล์เสียงได้");
    });
  };

  const handleAudioUpload = async (slot, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [slot]: 0 }));
    try {
      await uploadAudioFile(slot, file, (progress) => {
        setUploading(prev => ({ ...prev, [slot]: progress }));
      });
      toast.success('อัปโหลดไฟล์เสียงเรียบร้อยแล้ว');
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(prev => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 font-['Sarabun'] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 md:px-10 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800">ตั้งค่าระบบ</h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">จัดการช่องบริการและโต๊ะคิดเงิน</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden md:inline">เพิ่มโต๊ะบริการ</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-12">
        {/* System Settings Section */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <AdjustmentsHorizontalIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">โหมดการจัดสรรคิว</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">เลือกวิธีการมอบหมายโต๊ะบริการให้กับลูกค้า</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => handleToggleMode('immediate')}
              className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${systemSettings.assignmentMode === 'immediate' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${systemSettings.assignmentMode === 'immediate' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <HashtagIcon className="w-6 h-6" />
                </div>
                {systemSettings.assignmentMode === 'immediate' && (
                  <CheckCircleIcon className="w-6 h-6 text-indigo-500" />
                )}
              </div>
              <h3 className={`font-black text-lg mb-1 ${systemSettings.assignmentMode === 'immediate' ? 'text-indigo-900' : 'text-slate-700'}`}>จัดสรรทันที (Immediate)</h3>
              <p className="text-sm text-slate-500 font-medium">ลูกค้ารู้เลขโต๊ะทันทีบนบัตรคิว ระบบจะคำนวณคิวที่ว่างที่สุดให้</p>
            </button>

            <button 
              onClick={() => handleToggleMode('on-call')}
              className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${systemSettings.assignmentMode === 'on-call' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${systemSettings.assignmentMode === 'on-call' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
                </div>
                {systemSettings.assignmentMode === 'on-call' && (
                  <CheckCircleIcon className="w-6 h-6 text-indigo-500" />
                )}
              </div>
              <h3 className={`font-black text-lg mb-1 ${systemSettings.assignmentMode === 'on-call' ? 'text-indigo-900' : 'text-slate-700'}`}>จัดสรรเมื่อเรียก (On-Call)</h3>
              <p className="text-sm text-slate-500 font-medium">คิวจะถูกจัดสรรเข้าโต๊ะก็ต่อเมื่อพนักงานกดเรียก ช่วยลดปัญหาคิวข้าม</p>
            </button>
          </div>
        </section>

        {/* Queue Numbering Mode Section */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <ListBulletIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">รูปแบบการรันเลขคิว</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">เลือกรูปแบบตัวอักษรนำหน้าเลขคิว</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => handleToggleNumberingMode('unified')}
              className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${systemSettings.numberingMode === 'unified' || !systemSettings.numberingMode ? 'border-amber-500 bg-amber-50/30' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${systemSettings.numberingMode === 'unified' || !systemSettings.numberingMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <ListBulletIcon className="w-6 h-6" />
                </div>
                {(systemSettings.numberingMode === 'unified' || !systemSettings.numberingMode) && (
                  <CheckCircleIcon className="w-6 h-6 text-amber-500" />
                )}
              </div>
              <h3 className={`font-black text-lg mb-1 ${systemSettings.numberingMode === 'unified' || !systemSettings.numberingMode ? 'text-amber-900' : 'text-slate-700'}`}>เลขชุดเดียว (Unified)</h3>
              <p className="text-sm text-slate-500 font-medium">ทุกประเภทใช้ตัว Q นำหน้าเหมือนกันหมด (Q001, Q002...)</p>
            </button>

            <button 
              onClick={() => handleToggleNumberingMode('separated')}
              className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${systemSettings.numberingMode === 'separated' ? 'border-amber-500 bg-amber-50/30' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${systemSettings.numberingMode === 'separated' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <Squares2X2Icon className="w-6 h-6" />
                </div>
                {systemSettings.numberingMode === 'separated' && (
                  <CheckCircleIcon className="w-6 h-6 text-amber-500" />
                )}
              </div>
              <h3 className={`font-black text-lg mb-1 ${systemSettings.numberingMode === 'separated' ? 'text-amber-900' : 'text-slate-700'}`}>แยกตามประเภท (Separated)</h3>
              <p className="text-sm text-slate-500 font-medium">เงินสดใช้ C, เงินโอนใช้ T (C001, T001...) เลขรันแยกกัน</p>
            </button>
          </div>
        </section>

        {/* Audio Files Section */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600">
                <SpeakerWaveIcon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800">ไฟล์เสียงประกาศคิว</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">อัปโหลดไฟล์เสียงสำหรับแต่ละส่วนของประกาศ</p>
              </div>
            </div>
            <div className="hidden md:block px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-black text-slate-500">
                {Object.keys(audioFiles).length} / {PHRASE_SLOTS.length + DIGIT_SLOTS.length} ไฟล์
              </span>
            </div>
          </div>

          <div className="space-y-10">
            {/* Phrases & Letters */}
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">ประโยคและตัวอักษร</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PHRASE_SLOTS.map(slot => (
                  <AudioSlotCard 
                    key={slot.key} 
                    slot={slot} 
                    audioFiles={audioFiles} 
                    uploading={uploading} 
                    testPlay={testPlay} 
                    onUpload={handleAudioUpload} 
                    fileInputRefs={fileInputRefs} 
                  />
                ))}
              </div>
            </div>

            {/* Digits */}
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">ตัวเลข 0 – 9</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {DIGIT_SLOTS.map(slot => (
                  <div key={slot.key} className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border-2 transition-all ${
                    audioFiles[slot.key] ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-50 bg-slate-50/30'
                  }`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ${
                      audioFiles[slot.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-300 shadow-sm'
                    }`}>
                      {slot.label}
                    </div>
                    
                    <div className="flex gap-2">
                      {audioFiles[slot.key] && (
                        <button 
                          onClick={() => testPlay(audioFiles[slot.key])} 
                          className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                        >
                          <PlayIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => fileInputRefs.current[slot.key]?.click()}
                        className={`p-2 rounded-xl transition-all ${
                          uploading[slot.key] !== undefined ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-black'
                        }`}
                      >
                        <ArrowUpTrayIcon className="w-5 h-5" />
                      </button>
                      <input
                        ref={el => fileInputRefs.current[slot.key] = el}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={e => { handleAudioUpload(slot.key, e.target.files[0]); e.target.value = ''; }}
                      />
                    </div>
                    {uploading[slot.key] !== undefined && (
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploading[slot.key]}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Layout Section */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600">
              <TvIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">เลย์เอาต์หน้าแดชบอร์ด</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ปรับอัตราส่วนระหว่างวิดีโอและรายการเรียกคิว</p>
            </div>
          </div>

          <div className="space-y-10">
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 w-full space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">สัดส่วนพื้นที่วิดีโอ : รายการคิว</label>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-slate-800">{dashboardSettings.videoRatio}</span>
                        <span className="text-xl font-bold text-slate-300">:</span>
                        <span className="text-3xl font-black text-slate-500">{100 - dashboardSettings.videoRatio}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative pt-6">
                    <input 
                      type="range" min="30" max="80" step="1"
                      value={dashboardSettings.videoRatio}
                      onChange={(e) => handleUpdateDashboardLayout(parseInt(e.target.value))}
                      className="w-full accent-sky-600 h-3 bg-slate-200 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <span>เน้นรายการคิว</span>
                      <span>เน้นวิดีโอ</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64 aspect-video bg-white rounded-2xl border-2 border-slate-200 p-2 flex gap-1 shadow-inner overflow-hidden shrink-0">
                   <div className="h-full bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300" style={{ width: `${dashboardSettings.videoRatio}%` }}>
                     <VideoCameraIcon className="w-6 h-6 text-slate-300" />
                   </div>
                   <div className="h-full bg-sky-50 rounded-lg flex items-center justify-center border border-dashed border-sky-200" style={{ width: `${100 - dashboardSettings.videoRatio}%` }}>
                     <ListBulletIcon className="w-6 h-6 text-sky-200" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Print Settings Section */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <PrinterIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">ตั้งค่าเครื่องพิมพ์ (Kiosk)</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ตั้งค่ารูปแบบการพิมพ์สำหรับเครื่อง Kiosk บนอุปกรณ์นี้</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              {/* Mode Selection */}
              <div>
                <label className="block text-slate-400 font-black mb-4 uppercase tracking-wider text-[10px]">การเชื่อมต่อเครื่องพิมพ์</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => updatePrintConfig('mode', 'standard')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${printConfig.mode === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="font-black text-sm mb-1">Standard</div>
                    <div className="text-[10px] text-slate-500 font-bold">พิมพ์ผ่านบราวเซอร์</div>
                  </button>
                  <button 
                    onClick={() => updatePrintConfig('mode', 'rawbt')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${printConfig.mode === 'rawbt' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="font-black text-sm mb-1">RawBT</div>
                    <div className="text-[10px] text-slate-500 font-bold">แอป Android RawBT</div>
                  </button>
                  <button 
                    onClick={() => updatePrintConfig('mode', 'sunmi')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${printConfig.mode === 'sunmi' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="font-black text-sm mb-1">Sunmi</div>
                    <div className="text-[10px] text-slate-500 font-bold">เครื่อง Sunmi Direct</div>
                  </button>
                </div>
              </div>

              {/* Paper Size & Scale */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="block text-slate-400 font-black mb-4 uppercase tracking-wider text-[10px]">ขนาดหน้ากระดาษ</label>
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button 
                      onClick={() => updatePrintConfig('paper', '58')}
                      className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${printConfig.paper === '58' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      58 mm
                    </button>
                    <button 
                      onClick={() => updatePrintConfig('paper', '80')}
                      className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${printConfig.paper === '80' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      80 mm
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-slate-400 font-black uppercase tracking-wider text-[10px]">ขนาดการซูม (Scale)</label>
                    <span className="text-blue-600 font-black text-xs">{printConfig.scale}%</span>
                  </div>
                  <input 
                    type="range" min="50" max="300" step="10"
                    value={printConfig.scale}
                    onChange={(e) => updatePrintConfig('scale', parseInt(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 relative min-h-[250px] flex flex-col items-center justify-start overflow-hidden">
              <span className="absolute top-4 left-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Live Preview</span>
              <div className="mt-8 bg-white shadow-xl border border-slate-200 overflow-hidden" style={{ 
                width: printConfig.paper === '80' ? '72mm' : '48mm',
                padding: '5mm', 
                textAlign: 'center',
                zoom: printConfig.scale / 100
              }}>
                <div className="text-[6mm] font-black mb-1">บัตรคิว / QUEUE</div>
                <div className="text-[24mm] font-black leading-none my-2">A001</div>
                <div className="text-[8mm] font-black py-2 border-y-2 border-slate-900 my-2">
                  {systemSettings.numberingMode === 'separated' ? 'เงินสด' : 'คิวทั่วไป'}
                </div>
                <div className="text-[4mm] font-bold text-slate-500 mt-2">P.TECH Queueing System</div>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-slate-100 pt-12">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">จัดการโต๊ะบริการ</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">เพิ่มหรือแก้ไขรายละเอียดของแต่ละช่องบริการ</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <AnimatePresence>
            {tables.map((table) => (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
              >
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 translate-x-16 -translate-y-16 rounded-full blur-3xl opacity-10 ${table.type === 'CASH' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${table.type === 'CASH' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                    {table.type === 'CASH' ? <BanknotesIcon className="w-8 h-8" /> : <CreditCardIcon className="w-8 h-8" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openEdit(table)}
                      className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 hover:rounded-xl transition-all"
                    >
                      <PencilIcon className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => handleDelete(table.tableNumber)}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 hover:rounded-xl transition-all"
                    >
                      <TrashIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <HashtagIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">ช่องบริการที่</span>
                    <span className="text-2xl font-black text-slate-800">{table.tableNumber}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-slate-400" />
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${table.type === 'CASH' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {table.type === 'CASH' ? 'เงินสด (Cash)' : 'เงินโอน (Transfer)'}
                    </span>
                  </div>

                  {table.note && (
                    <div className="flex items-start gap-2 pt-2 border-t border-slate-50 mt-4">
                      <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">หมายเหตุ / โน๊ต</span>
                        <p className="text-slate-600 font-medium leading-relaxed">{table.note}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {tables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <AdjustmentsHorizontalIcon className="w-20 h-20 opacity-20 mb-4" />
            <p className="text-xl font-bold italic">ยังไม่มีการตั้งค่าโต๊ะบริการ</p>
          </div>
        )}
      </div>
    </main>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-lg p-10 relative z-10 shadow-2xl"
            >
              <h2 className="text-3xl font-black text-slate-800 mb-8">
                {editingTable ? `แก้ไขโต๊ะที่ ${editingTable.tableNumber}` : 'เพิ่มโต๊ะบริการใหม่'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">เลขโต๊ะ / ช่องบริการ</label>
                  <input 
                    type="number" 
                    value={formData.tableNumber}
                    onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                    disabled={!!editingTable}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    placeholder="เช่น 1, 2, 3"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">ประเภทการรับชำระ</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'CASH' })}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.type === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <BanknotesIcon className="w-8 h-8" />
                      <span className="font-black text-xs uppercase">เงินสด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'TRANSFER' })}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.type === 'TRANSFER' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <CreditCardIcon className="w-8 h-8" />
                      <span className="font-black text-xs uppercase">เงินโอน</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">โน๊ต / หมายเหตุ</label>
                  <textarea 
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium text-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all h-24"
                    placeholder="เช่น โต๊ะหน้าเคาน์เตอร์, ประตูทางเข้า..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function AudioSlotCard({ slot, audioFiles, uploading, testPlay, onUpload, fileInputRefs }) {
  const isUploading = slot.key in uploading;
  const progress = uploading[slot.key] ?? 0;
  const hasFile = !!audioFiles[slot.key];

  return (
    <div className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all ${
      hasFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-50 bg-slate-50/30'
    }`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
        hasFile ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-300 shadow-sm'
      }`}>
        {hasFile ? <CheckCircleIcon className="w-7 h-7" /> : <SpeakerWaveIcon className="w-7 h-7" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-700 text-sm">{slot.label}</p>
        <p className="text-[10px] font-bold text-slate-400 truncate">{slot.hint}</p>
        {isUploading && (
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasFile && !isUploading && (
          <button
            onClick={() => testPlay(audioFiles[slot.key])}
            className="p-2.5 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
          >
            <PlayIcon className="w-6 h-6" />
          </button>
        )}
        <button
          disabled={isUploading}
          onClick={() => fileInputRefs.current[slot.key]?.click()}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all ${
            isUploading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black active:scale-95'
          }`}
        >
          <ArrowUpTrayIcon className="w-4 h-4" />
          {isUploading ? `${progress}%` : (hasFile ? 'เปลี่ยน' : 'อัปโหลด')}
        </button>
        <input
          ref={el => fileInputRefs.current[slot.key] = el}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={e => { onUpload(slot.key, e.target.files[0]); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}

