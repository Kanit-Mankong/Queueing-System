import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  listenPlaylist, 
  addVideoToPlaylist, 
  removeVideoFromPlaylist, 
  reorderPlaylistItems,
  setCurrentVideoState,
  listenDashboardSettings,
  toggleVideoVisibility,
  updateVideoAspect,
  updateVideoNote
} from '../firebase/queueService';

import { 
  PlusIcon, 
  TrashIcon, 
  PlayIcon,
  ArrowLeftIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  DevicePhoneMobileIcon,
  TvIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';




// ── Component ─────────────────────────────────────────────────────────────────
export default function PlaylistManager() {
  const [playlist, setPlaylist] = useState([]);
  const [settings, setSettings] = useState({ currentVideoIndex: 0 });
  const [newVideoUrl, setNewVideoUrl] = useState('');


  useEffect(() => {
    const unsubPlaylist = listenPlaylist(setPlaylist);
    const unsubSettings = listenDashboardSettings(setSettings);
    return () => { unsubPlaylist(); unsubSettings(); };
  }, []);





  // ── Playlist helpers ──────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newVideoUrl.trim()) return;
    const url = newVideoUrl.trim();
    
    // Check for YouTube Playlist
    const playlistRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
    const playlistMatch = url.match(playlistRegex);
    
    // Check for YouTube Video
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const videoMatch = url.match(youtubeRegex);

    if (playlistMatch) {
      const listId = playlistMatch[1];
      const embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&vq=hd1080`;
      await addVideoToPlaylist(embedUrl, 0, playlist.length, 'YouTube Playlist');
      setNewVideoUrl('');
      toast.success('เพิ่มเพลย์ลิสต์ YouTube เรียบร้อยแล้ว');
    } else if (videoMatch) {
      const id = videoMatch[1];
      const isVertical = url.includes('shorts');
      const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&vq=hd1080${isVertical ? '&isShort=1' : ''}`;
      await addVideoToPlaylist(embedUrl, 0, playlist.length);
      setNewVideoUrl('');
      toast.success('เพิ่มวิดีโอ YouTube เรียบร้อยแล้ว');
    } else {
      toast.error('รองรับเฉพาะลิงก์จาก YouTube เท่านั้น', { icon: '⚠️' });
    }
  };

  // Called when Reorder changes the array
  const handleReorder = async (newOrder) => {
    // Optimistic UI update
    setPlaylist(newOrder);
    // Background sync to Firestore
    await reorderPlaylistItems(newOrder);
  };

  const playNow = async (index) => {
    await setCurrentVideoState(index);
    toast.success('ส่งคำสั่งเล่นคลิปนี้ไปยัง Dashboard แล้ว 🚀', {
      style: { borderRadius: '1.5rem', background: '#0f172a', color: '#fff' }
    });
  };







  return (
    <div className="min-h-screen bg-slate-50 font-['Sarabun'] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12 gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link to="/" className="p-2 md:p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-blue-600">
              <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-slate-800">จัดการเพลย์ลิสต์</h1>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Playlist Manager v2.0</p>
            </div>
          </div>
          <div className="bg-emerald-50 px-4 py-1.5 md:px-6 md:py-2 rounded-full border border-emerald-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 text-[10px] md:text-xs font-black uppercase tracking-widest">Synced with Dashboard</span>
          </div>
        </header>

        {/* ─── Audio Files Section ─── */}
        <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 p-6 md:p-10 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg md:text-xl font-black flex items-center gap-2">
              <SpeakerWaveIcon className="w-5 h-5 md:w-6 md:h-6 text-violet-500" />
              ไฟล์เสียงประกาศคิว
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              uploadedCount === totalSlots ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {uploadedCount}/{totalSlots} ไฟล์
            </span>
          </div>
          <p className="text-slate-400 text-sm font-medium mb-6">
            อัปโหลดไฟล์เสียง MP3/WAV สำหรับแต่ละส่วน — ระบบจะนำมาต่อกันอัตโนมัติเมื่อเรียกคิว
          </p>

          {/* ประโยค */}
          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">ประโยคประกาศ</p>
            <div className="flex flex-col gap-3">
              {PHRASE_SLOTS.map(slot => <AudioSlot key={slot.key} slot={slot} />)}
            </div>
          </div>

          {/* ตัวเลข */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">ตัวเลข 0 – 9</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {DIGIT_SLOTS.map(slot => (
                <div key={slot.key} className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  audioFiles[slot.key] ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'
                }`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${
                    audioFiles[slot.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {slot.label}
                  </div>
                  {uploading[slot.key] !== undefined ? (
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uploading[slot.key]}%` }} />
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      {audioFiles[slot.key] && (
                        <button onClick={() => testPlay(audioFiles[slot.key])} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all">
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => fileInputRefs.current[slot.key]?.click()}
                        className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all active:scale-95"
                        title="อัปโหลด"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                      </button>
                      <input
                        ref={el => fileInputRefs.current[slot.key] = el}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={e => { handleAudioUpload(slot.key, e.target.files[0]); e.target.value = ''; }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-xs text-blue-700 font-bold leading-relaxed">
              💡 <strong>ลำดับการเล่น:</strong> เชิญหมายเลข → Q (คิว) → [เลขคิวแต่ละหลัก] → ที่ช่องบริการ → [เลขช่องแต่ละหลัก] → ลงท้าย<br/>
              ตัวอย่าง Q034 ช่อง 2 → เชิญหมายเลข + Q + 0 + 3 + 4 + ที่ช่องบริการ + 2 + ลงท้าย
            </p>
          </div>
        </section>

        {/* ─── Add Video Section ─── */}
        <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 p-6 md:p-10 mb-8">
          <h2 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2">
            <PlusIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
            เพิ่มคลิปใหม่
          </h2>
          <div className="space-y-4">
            <input 
              type="text" 
              value={newVideoUrl} 
              onChange={(e) => setNewVideoUrl(e.target.value)} 
              placeholder="วางลิงก์ YouTube..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:border-blue-400 transition-colors text-sm md:text-base" 
            />
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 bg-blue-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-blue-100">
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs md:text-sm text-blue-600 font-bold uppercase tracking-wider">
                  * วิดีโอ YouTube จะเล่นจนจบและเปลี่ยนคลิปอัตโนมัติ
                </p>
              </div>
              <button onClick={handleAdd} className="w-full md:w-auto bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 text-sm md:text-base">
                เพิ่มคลิป
              </button>
            </div>
          </div>
        </section>

        {/* ─── Playlist Section ─── */}
        <section className="space-y-4">
          <h2 className="text-lg md:text-xl font-black mb-4 md:mb-6 px-4 flex items-center gap-2">
            <VideoCameraIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
            ลำดับการเล่นปัจจุบัน
          </h2>
          
          {playlist.length > 0 ? (
            <Reorder.Group 
              axis="y" 
              values={playlist} 
              onReorder={handleReorder}
              className="space-y-4"
            >
              {playlist.map((item, index) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item}
                  className={`bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 md:gap-6 group transition-all ${settings.currentVideoIndex === index ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                >
                  <div className="flex flex-col items-center gap-1 shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-blue-500 px-2">
                    <Bars3Icon className="w-6 h-6 md:w-8 md:h-8" />
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] md:text-sm font-black text-slate-500">{index + 1}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-slate-400 truncate mb-1">{item.url}</p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 mb-2">
                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-wider ${item.duration === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.duration === 0 ? 'Auto Duration' : `${Math.floor(item.duration / 60)}m ${item.duration % 60}s`}
                      </span>
                      {settings.currentVideoIndex === index && (
                        <span className="text-blue-600 text-[8px] md:text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-blue-600" /> Currently Playing
                        </span>
                      )}
                      {item.isHidden && (
                        <span className="text-rose-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                          <EyeSlashIcon className="w-3 h-3" /> ซ่อนอยู่
                        </span>
                      )}
                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${item.isVertical ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {item.isVertical ? <DevicePhoneMobileIcon className="w-3 h-3" /> : <TvIcon className="w-3 h-3" />}
                        {item.isVertical ? 'แนวตั้ง (9:16)' : 'แนวนอน (16:9)'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={item.note || ''}
                      onChange={(e) => updateVideoNote(item.id, e.target.value)}
                      placeholder="เพิ่มโน้ตหรือรายละเอียดวิดีโอนี้..."
                      className="w-full text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors cursor-text"
                      onPointerDown={(e) => e.stopPropagation()} /* Prevent drag when clicking input */
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateVideoAspect(item.id, !item.isVertical); }} 
                      className={`p-1.5 md:p-2 rounded-xl transition-colors ${item.isVertical ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} 
                      title={item.isVertical ? 'สลับเป็นแนวนอน' : 'สลับเป็นแนวตั้ง'}
                    >
                      {item.isVertical ? <DevicePhoneMobileIcon className="w-5 h-5 md:w-6 md:h-6" /> : <TvIcon className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleVideoVisibility(item.id, item.isHidden); }} 
                      className={`p-1.5 md:p-2 rounded-xl transition-colors ${item.isHidden ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} 
                      title={item.isHidden ? 'แสดงวิดีโอนี้' : 'ซ่อนวิดีโอนี้'}
                    >
                      {item.isHidden ? <EyeSlashIcon className="w-5 h-5 md:w-6 md:h-6" /> : <EyeIcon className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); playNow(index); }} 
                      className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] md:text-sm hover:bg-black transition-colors" 
                      disabled={item.isHidden}
                    >
                      <PlayIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden xs:inline">เล่นตอนนี้</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeVideoFromPlaylist(item.id); }} 
                      className="p-1.5 md:p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <TrashIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <div className="text-center py-20 bg-slate-100/50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <VideoCameraIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">ยังไม่มีวิดีโอในเพลย์ลิสต์</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
