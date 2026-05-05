// src/pages/Kiosk.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestQueue, listenSystemSettings } from '../firebase/queueService';

import { 
  BanknotesIcon, 
  CreditCardIcon, 
  CheckCircleIcon,
  ChevronLeftIcon,
  PrinterIcon,
  QrCodeIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const playPop = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio Context not supported");
  }
};

export default function Kiosk() {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [countdown, setCountdown] = useState(8);

  const [isPrinting, setIsPrinting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [printConfig, setPrintConfig] = useState(() => {
    const saved = localStorage.getItem('printConfig');
    return saved ? JSON.parse(saved) : { mode: 'standard', paper: '80', scale: 100 };
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPassword, setExitPassword] = useState('');
  const [systemSettings, setSystemSettings] = useState({ assignmentMode: 'immediate' });


  const updateConfig = (key, value) => {
    const newConfig = { ...printConfig, [key]: value };
    setPrintConfig(newConfig);
    localStorage.setItem('printConfig', JSON.stringify(newConfig));
  };
  const navigate = useNavigate();

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return listenSystemSettings(setSystemSettings);
  }, []);


  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(console.error);
      }
      if (window.sunmi && window.sunmi.setFullScreen) window.sunmi.setFullScreen(true);
      if (window.Android && window.Android.setFullScreen) window.Android.setFullScreen(true);
      setIsFullscreen(true);
    } else {
      setShowExitModal(true);
    }
  };

  const handleExitFullscreen = (e) => {
    e.preventDefault();
    if (exitPassword === '1212312121@Abc') {
      if (document.exitFullscreen) document.exitFullscreen().catch(console.error);
      if (window.sunmi && window.sunmi.setFullScreen) window.sunmi.setFullScreen(false);
      if (window.Android && window.Android.setFullScreen) window.Android.setFullScreen(false);
      setIsFullscreen(false);
      setShowExitModal(false);
      setExitPassword('');
    } else {
      toast.error('รหัสผ่านไม่ถูกต้อง');
    }
  };

  useEffect(() => {
    let timer;
    if (ticket && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      reset();
    }
    return () => clearInterval(timer);
  }, [ticket, countdown]);

  const handleRequest = async (paymentType) => {
    playPop();
    setLoading(true);
    try {
      const newTicket = await requestQueue(paymentType);
      setTicket(newTicket);
      setCountdown(8); // Faster return to home

    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการรับคิว');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    
    setTimeout(() => {
      const typeLabel = ticket.paymentType === 'CASH' ? 'เงินสด' : 'เงินโอน';
      const dateStr = new Date().toLocaleString('th-TH');

      if (printConfig.mode === 'sunmi') {
        // --- Sunmi Built-in JS API (สำหรับ Sunmi Web Browser/Wrapper) ---
        let sPrinter = window.sunmi || window.SunmiPrinter || window.sunmiInnerPrinter;
        
        if (sPrinter) {
          const scale = printConfig.scale / 100;
          try {
            if(sPrinter.initPrinter) sPrinter.initPrinter();
            if(sPrinter.setAlignment) sPrinter.setAlignment(1); // 1 = center
            
            if(sPrinter.setFontSize) sPrinter.setFontSize(Math.floor(24 * scale));
            if(sPrinter.printOriginalText) sPrinter.printOriginalText('บัตรคิว / QUEUE\n');
            
            if(sPrinter.setFontSize) sPrinter.setFontSize(Math.floor(64 * scale));
            if(sPrinter.printOriginalText) sPrinter.printOriginalText(ticket.number + '\n');
            
            if(sPrinter.setFontSize) sPrinter.setFontSize(Math.floor(24 * scale));
            const tableText = ticket.assignedTable === 0 ? '' : `ช่อง: ${ticket.assignedTable} | `;
            if(sPrinter.printOriginalText) sPrinter.printOriginalText(`${tableText}${typeLabel}\n`);


            
            if(sPrinter.setFontSize) sPrinter.setFontSize(Math.floor(20 * scale));
            if(sPrinter.printOriginalText) sPrinter.printOriginalText(dateStr + '\n');
            if(sPrinter.printOriginalText) sPrinter.printOriginalText('P.TECH Queueing System\n');
            
            if(sPrinter.lineWrap) sPrinter.lineWrap(4);
            if(sPrinter.commitPrinterBuffer) sPrinter.commitPrinterBuffer();
          } catch(e) {
            console.error(e);
            toast.error("เกิดข้อผิดพลาดในการส่งคำสั่งไป Sunmi");
          }
        } else if (window.Android && window.Android.print) {
            // Generic Android Print Bridge
            const tableText = ticket.assignedTable === 0 ? '' : `ช่อง: ${ticket.assignedTable} | `;
            const printStr = `บัตรคิว / QUEUE\n${ticket.number}\n${tableText}${typeLabel}\n${dateStr}\n`;
            window.Android.print(printStr);
        } else if (window.PrintInterface && window.PrintInterface.print) {
            // Another common generic bridge
            const tableText = ticket.assignedTable === 0 ? '' : `ช่อง: ${ticket.assignedTable} | `;
            const printStr = `บัตรคิว / QUEUE\n${ticket.number}\n${tableText}${typeLabel}\n${dateStr}\n`;
            window.PrintInterface.print(printStr);


        } else {
          toast.error("ไม่พบระบบเชื่อมต่อ (กรุณาเปิดผ่านแอป Sunmi Browser หรือใช้แอปที่รองรับ)");
        }
      } else if (printConfig.mode === 'rawbt') {
        // --- RawBT Silent Print ---
        const printElement = document.getElementById('print-area');
        if (printElement) {
          const cleanHtml = printElement.outerHTML.replace(/hidden/g, '').replace(/print:block/g, '');
          const fullHtml = `<html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:white;">${cleanHtml}</body></html>`;
          const encodedHtml = btoa(unescape(encodeURIComponent(fullHtml)));
          const intentUrl = `intent:data:text/html;base64,${encodedHtml}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
          window.location.href = intentUrl;
        }
      } else {
        // --- Standard Browser Print ---
        window.print();
      }
      setIsPrinting(false);
    }, 500);
  };

  useEffect(() => {
    if (ticket && !isPrinting) {
      handlePrint();
    }
  }, [ticket]);

  const reset = () => {
    setTicket(null);
    setCountdown(8);
  };


  return (
    <div 
      className="min-h-screen bg-[#060912] text-white p-6 md:p-10 flex flex-col items-center justify-center font-['Sarabun'] relative overflow-hidden"
      style={{ touchAction: isFullscreen ? 'none' : 'auto' }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Hidden Print Area - Safe-Zone Pixels Edition */}
      {ticket && (
        <>
          <style>
            {`
              @media print {
                @page { margin: 0; size: auto; }
                body { margin: 0; padding: 0; }
                #print-area { display: block !important; }
              }
            `}
          </style>
          <div id="print-area" className="hidden print:block text-black bg-white" style={{ 
            width: printConfig.paper === '80' ? '72mm' : '48mm',
            margin: '0 auto',
            padding: '4mm', 
            fontFamily: "'Sarabun', sans-serif",
            fontWeight: '800',
            lineHeight: '1.2',
            textAlign: 'center',
            color: 'black',
            zoom: printConfig.scale / 100
          }}>
            <div style={{ fontSize: '6mm', marginBottom: '2mm', letterSpacing: '1px' }}>
              บัตรคิว / QUEUE
            </div>
            
            <div style={{ fontSize: '26mm', fontWeight: '900', margin: '2mm 0', lineHeight: '1' }}>
              {ticket.number}
            </div>
            
            <div style={{ 
              fontSize: '8mm', 
              padding: '4mm 0', 
              margin: '4mm 0',
              borderTop: '1mm solid black', 
              borderBottom: '1mm solid black',
              display: 'flex',
              justifyContent: 'center',
              gap: '3mm'
            }}>
              {ticket.assignedTable !== 0 && (
                <>
                  <span>ช่อง: {ticket.assignedTable}</span>
                  <span>|</span>
                </>
              )}
              <span>{ticket.paymentType === 'CASH' ? 'เงินสด' : 'เงินโอน'}</span>
            </div>


            
            <div style={{ fontSize: '5mm', marginTop: '2mm' }}>
              {new Date().toLocaleString('th-TH', { 
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
            
            <div style={{ fontSize: '4.5mm', marginTop: '2mm', fontWeight: 'bold' }}>
              P.TECH Queueing System
            </div>
            
            <div style={{ height: '10mm' }}></div>
          </div>
        </>
      )}

      <div className="max-w-4xl w-full relative z-10">
        <AnimatePresence mode="wait">
          {!ticket ? (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full text-center"
            >
              <div className="mb-12">
                <h1 className="text-4xl md:text-7xl font-black text-white mb-4 tracking-tighter uppercase">กรุณากดรับบัตรคิว</h1>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-sm md:text-base">Please select your payment type</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -8 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRequest('CASH')}
                  disabled={loading}
                  className="group relative h-[300px] md:h-[400px] rounded-[3rem] overflow-hidden bg-emerald-500 shadow-2xl shadow-emerald-500/20 flex flex-col items-center justify-center p-10 text-center transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="bg-white/20 p-8 rounded-[2.5rem] mb-8 group-hover:scale-110 transition-transform">
                    <BanknotesIcon className="w-20 h-20 text-white" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-2">เงินสด</h2>
                  <p className="text-emerald-100 font-bold uppercase tracking-widest text-sm">Cash Payment • ช่องบริการเงินสด</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, translateY: -8 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRequest('TRANSFER')}
                  disabled={loading}
                  className="group relative h-[300px] md:h-[400px] rounded-[3rem] overflow-hidden bg-blue-600 shadow-2xl shadow-blue-600/20 flex flex-col items-center justify-center p-10 text-center transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="bg-white/20 p-8 rounded-[2.5rem] mb-8 group-hover:scale-110 transition-transform">
                    <CreditCardIcon className="w-20 h-20 text-white" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-2">เงินโอน</h2>
                  <p className="text-blue-100 font-bold uppercase tracking-widest text-sm">Transfer • ช่องบริการเงินโอน</p>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="glass-dark border-emerald-500/20 bg-emerald-500/5 p-12 md:p-20 rounded-[4rem] text-center max-w-2xl w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10">
                  <CheckCircleIcon className="w-16 h-16 text-emerald-500 opacity-20" />
                </div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-emerald-500 font-black uppercase tracking-[0.4em] mb-6 block text-sm">รับคิวสำเร็จ</span>
                  <div className="text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter text-white mb-8">
                    {ticket.number}
                  </div>
                  
                  <div className="flex flex-col items-center gap-4 mb-12">
                    <div className="px-8 py-3 bg-white/10 rounded-2xl border border-white/10">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">
                        {ticket.assignedTable === 0 ? 'สถานะการมอบหมาย' : 'โต๊ะที่ได้รับมอบหมาย'}
                      </p>
                      <p className="text-3xl font-black text-white">
                        {ticket.assignedTable === 0 ? 'กรุณารอประกาศเลขโต๊ะ' : `ช่องบริการ ${ticket.assignedTable}`}
                      </p>
                    </div>
                  </div>


                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      className="px-10 py-5 glass-dark rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95"
                      onClick={reset}
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                      เสร็จสิ้น (กดข้าม)
                    </button>
                  </div>
                </motion.div>
              </div>

              <AnimatePresence>
                {isPrinting && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-6 bg-blue-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-3 shadow-xl"
                  >
                    <PrinterIcon className="w-5 h-5 animate-bounce" />
                    กำลังเตรียมพิมพ์บัตรคิว...
                  </motion.div>
                )}
              </AnimatePresence>

              {!isPrinting && (
                <p className="mt-12 text-slate-500 font-bold animate-pulse">หน้าจอจะกลับสู่หน้าหลักใน {countdown} วินาที...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Fullscreen Button */}
      {!ticket && !showSettings && (
        <button 
          onClick={toggleFullscreen}
          className="absolute top-6 right-6 p-4 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center gap-2 transition-all shadow-lg z-40 border border-white/10"
        >
          {isFullscreen ? (
            <ArrowsPointingInIcon className="w-6 h-6 text-white" />
          ) : (
            <ArrowsPointingOutIcon className="w-6 h-6 text-white" />
          )}
        </button>
      )}

      {/* Print Settings Button */}
      {!ticket && !showSettings && (
        <button 
          onClick={() => setShowSettings(true)}
          className="absolute bottom-6 right-6 p-4 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center gap-2 transition-all shadow-lg z-40 border border-white/10"
        >
          <Cog6ToothIcon className="w-6 h-6 text-white" />
          <span className="text-white font-bold text-sm hidden md:block">ตั้งค่า</span>
        </button>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-dark border border-white/10 w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl overflow-hidden"
            >
              {/* Sticky Header */}
              <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                  <PrinterIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                  ตั้งค่าเครื่องปริ้น
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <XMarkIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
                {/* Mode Selection */}
                <div>
                  <label className="block text-slate-400 font-bold mb-3 uppercase tracking-wider text-sm">การเชื่อมต่อ</label>
                  <div className="grid gap-3">
                    <button 
                      onClick={() => updateConfig('mode', 'standard')}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${printConfig.mode === 'standard' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/30'}`}
                    >
                      <div>
                        <div className="font-bold text-white">ปริ้นปกติ (Standard)</div>
                        <div className="text-xs text-slate-500">พิมพ์ผ่านบราวเซอร์ / คอมพิวเตอร์</div>
                      </div>
                      {printConfig.mode === 'standard' && <CheckCircleIcon className="w-6 h-6 text-blue-500" />}
                    </button>
                    
                    <button 
                      onClick={() => updateConfig('mode', 'rawbt')}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${printConfig.mode === 'rawbt' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'}`}
                    >
                      <div>
                        <div className="font-bold text-white">แอป RawBT (อัตโนมัติ)</div>
                        <div className="text-xs text-slate-500">สำหรับ Android / Tablet ที่ลงแอป RawBT</div>
                      </div>
                      {printConfig.mode === 'rawbt' && <CheckCircleIcon className="w-6 h-6 text-emerald-500" />}
                    </button>

                    <button 
                      onClick={() => updateConfig('mode', 'sunmi')}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${printConfig.mode === 'sunmi' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-white/30'}`}
                    >
                      <div>
                        <div className="font-bold text-white">Sunmi เครื่องปริ้นในตัว</div>
                        <div className="text-xs text-slate-500">ผ่าน Sunmi Browser / SDK โดยตรง</div>
                      </div>
                      {printConfig.mode === 'sunmi' && <CheckCircleIcon className="w-6 h-6 text-orange-500" />}
                    </button>
                  </div>
                </div>

                {/* Paper Size */}
                <div>
                  <label className="block text-slate-400 font-bold mb-3 uppercase tracking-wider text-sm">ขนาดกระดาษ</label>
                  <div className="flex bg-black/40 p-1 rounded-xl">
                    <button 
                      onClick={() => updateConfig('paper', '58')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all ${printConfig.paper === '58' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                    >
                      58 mm
                    </button>
                    <button 
                      onClick={() => updateConfig('paper', '80')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all ${printConfig.paper === '80' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                    >
                      80 mm
                    </button>
                  </div>
                </div>

                {/* Scale/Zoom */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-400 font-bold uppercase tracking-wider text-sm">การซูม (Scale)</label>
                    <span className="text-blue-400 font-bold">{printConfig.scale}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="500" 
                    step="10"
                    value={printConfig.scale}
                    onChange={(e) => updateConfig('scale', parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-2 text-xs text-slate-500 font-bold">
                    <span>50%</span>
                    <span>100%</span>
                    <span>500%</span>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="border border-white/10 rounded-xl bg-black/50 overflow-hidden relative" style={{ height: '160px' }}>
                  <div className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 z-10 bg-black/80 px-2 py-1 rounded">
                    ตัวอย่าง (กระดาษ {printConfig.paper}mm)
                  </div>
                  <div className="w-full h-full overflow-auto flex justify-center items-start pt-10 pb-4">
                     <div className="bg-white text-black" style={{ 
                        width: printConfig.paper === '80' ? '72mm' : '48mm',
                        padding: '4mm', 
                        fontFamily: "'Sarabun', sans-serif",
                        fontWeight: '800',
                        lineHeight: '1.2',
                        textAlign: 'center',
                        zoom: printConfig.scale / 100
                     }}>
                        <div style={{ fontSize: '6mm', marginBottom: '2mm' }}>บัตรคิว / QUEUE</div>
                        <div style={{ fontSize: '26mm', fontWeight: '900', margin: '2mm 0', lineHeight: '1' }}>A001</div>
                        <div style={{ fontSize: '8mm', padding: '4mm 0', borderTop: '1mm solid black', borderBottom: '1mm solid black' }}>
                          {systemSettings.assignmentMode === 'on-call' ? '' : 'ช่อง: 1 | '}เงินสด
                        </div>


                     </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer / Save Button */}
              <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
                <button 
                  onClick={() => {
                    setShowSettings(false);
                    toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
                  }}
                  className="w-full py-3 md:py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                >
                  บันทึกและปิด
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Modal for Fullscreen Exit */}
      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowExitModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative z-10 shadow-2xl text-slate-800"
            >
              <button onClick={() => setShowExitModal(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-8">
                <KeyIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black mb-2">ออกจากโหมดเต็มหน้าจอ</h2>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">กรุณาใส่รหัสผ่านเพื่อยืนยันการออกจาก Kiosk Mode</p>
              <form onSubmit={handleExitFullscreen} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">รหัสผ่านยืนยัน</label>
                  <input type="password" autoFocus value={exitPassword} onChange={(e) => setExitPassword(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="รหัสผ่าน..." required />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                  ยืนยัน
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
