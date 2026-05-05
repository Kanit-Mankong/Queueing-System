import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TvIcon, 
  UserCircleIcon, 
  QrCodeIcon,
  VideoCameraIcon,
  TrashIcon,
  CalendarIcon,
  Cog6ToothIcon,
  KeyIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { resetQueues } from '../firebase/queueService';
import toast from 'react-hot-toast';

export default function Landing() {
  const navigate = useNavigate();

  const groups = [
    {
      id: 'dashboard',
      title: 'หน้าจอแสดงผล (Dashboard)',
      description: 'สำหรับทีวีส่วนกลาง เพื่อแสดงคิวปัจจุบันและเรียกคิว',
      icon: <TvIcon />,
      path: '/dashboard',
      color: 'bg-blue-500',
      shadow: 'shadow-blue-500/20'
    },
    {
      id: 'staff',
      title: 'หน้าเจ้าหน้าที่ (Staff Portal)',
      description: 'สำหรับเจ้าหน้าที่ประจำโต๊ะ เพื่อจัดการและเรียกคิว',
      icon: <UserCircleIcon />,
      path: '/staff',
      color: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20'
    },
    {
      id: 'settings',
      title: 'ตั้งค่าระบบ (Settings)',
      description: 'จัดการช่องบริการ เพิ่ม/ลบโต๊ะคิดเงิน และกำหนดประเภท',
      icon: <Cog6ToothIcon />,
      path: '/settings',
      color: 'bg-slate-700',
      shadow: 'shadow-slate-700/20'
    },
    {
      id: 'playlist',
      title: 'จัดการเพลย์ลิสต์ (Playlist Manager)',
      description: 'สำหรับจัดการวิดีโอ ลำดับการเล่น และการแสดงผลบน Dashboard',
      icon: <VideoCameraIcon />,
      path: '/playlist-manager',
      color: 'bg-orange-500',
      shadow: 'shadow-orange-500/20'
    },
    {
      id: 'kiosk',
      title: 'หน้ากดบัตรคิว (Kiosk)',
      description: 'สำหรับให้นักศึกษากดรับบัตรคิว เลือกประเภทการชำระเงิน',
      icon: <QrCodeIcon />,
      path: '/kiosk',
      color: 'bg-purple-500',
      shadow: 'shadow-purple-500/20'
    },
    {
      id: 'history',
      title: 'ประวัติการรับบริการ (History)',
      description: 'ดูรายงานสรุปยอดผู้รับบริการและรายละเอียดคิวย้อนหลังรายวัน',
      icon: <CalendarIcon />,
      path: '/history',
      color: 'bg-rose-500',
      shadow: 'shadow-rose-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-8 md:mb-12"
      >
        <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
          ระบบบริหารจัดการคิว
        </h1>
        <p className="text-slate-500 text-sm md:text-lg font-medium">
          กรุณาเลือกรูปแบบการใช้งานที่ต้องการ
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-6xl w-full relative z-10 px-4">
        {groups.map((group, index) => (
          <motion.button
            key={group.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(group.path)}
            className={`glass-dark p-5 md:p-6 rounded-[1.8rem] border border-white/5 hover:border-white/10 transition-all duration-300 group text-left flex flex-col items-start gap-3 hover:translate-y-[-4px] shadow-xl ${group.shadow}`}
            className={`glass-dark p-4 md:p-5 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-all duration-300 group text-left flex flex-col items-start gap-2 hover:translate-y-[-2px] shadow-lg ${group.shadow}`}
          >
            <div className={`p-2.5 rounded-xl ${group.color} text-white transition-transform duration-300 group-hover:scale-105`}>
              {/* Clone icon with smaller size */}
              {React.cloneElement(group.icon, { className: "w-5 h-5 md:w-6 md:h-6" })}
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white mb-0.5 group-hover:text-blue-400 transition-colors">
                {group.title}
              </h2>
              <p className="text-slate-500 text-[10px] md:text-xs font-medium leading-relaxed line-clamp-2">
                {group.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 relative z-10">
        <div className="text-slate-700 font-bold uppercase tracking-[0.3em] text-[10px]">
          Queueing System v2.0 • Premium Edition
        </div>
      </div>
    </div>
  );
}
