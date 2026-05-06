import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listenAllQueues, listenTables, listenPlaylist, listenDashboardSettings, setCurrentVideoState, listenAudioFiles } from '../firebase/queueService';
import CompactQueueCard from '../components/CompactQueueCard';
import { ClockIcon, VideoCameraIcon, PlayIcon } from '@heroicons/react/24/outline';

// ── Parse any YouTube URL into an embed URL ─────────────────────────────────
function parseYouTubeUrl(rawUrl) {
  if (!rawUrl) return null;
  // Already an embed URL - use as is
  if (rawUrl.includes('youtube.com/embed/')) return rawUrl;
  return null;
}

// ── Build a safe embed src for the iframe ──────────────────────────────────
function buildEmbedSrc(embedUrl) {
  if (!embedUrl) return null;
  try {
    const u = new URL(embedUrl);
    // Ensure required params are present
    u.searchParams.set('autoplay', '1');
    u.searchParams.set('mute', '1');
    u.searchParams.set('enablejsapi', '1');
    u.searchParams.set('controls', '0');
    u.searchParams.set('modestbranding', '1');
    u.searchParams.set('rel', '0');
    u.searchParams.set('vq', 'hd1080'); // highest quality
    u.searchParams.set('origin', window.location.origin);
    u.searchParams.set('loop', '1'); // loop the playlist or video

    // For single video (not videoseries), loop requires playlist=VIDEO_ID
    const pathParts = u.pathname.split('/');
    const videoId = pathParts[pathParts.length - 1];
    if (videoId && videoId !== 'videoseries' && !u.searchParams.has('playlist')) {
      u.searchParams.set('playlist', videoId);
    }

    return u.toString();
  } catch {
    return embedUrl;
  }
}

// ── Determine aspect ratio from embed URL ──────────────────────────────────
function isVerticalVideo(url) {
  return url?.includes('isShort=1') || url?.includes('/shorts/');
}

export default function Dashboard() {
  const [isStarted, setIsStarted] = useState(false);
  const [queues, setQueues] = useState([]);
  const [tables, setTables] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playlist, setPlaylist] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [audioFiles, setAudioFiles] = useState({});

  const audioFilesRef = useRef({});
  const lastSyncRef = useRef(0);
  const iframeRef = useRef(null);
  const playlistRef = useRef([]);
  const currentIdxRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { audioFilesRef.current = audioFiles; }, [audioFiles]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIdxRef.current = currentVideoIndex; }, [currentVideoIndex]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Firebase Listeners
  useEffect(() => {
    const u1 = listenAllQueues(setQueues);
    const u2 = listenTables(setTables);
    const u3 = listenPlaylist(setPlaylist);
    const u4 = listenDashboardSettings((data) => {
      if (data && typeof data.currentVideoIndex === 'number') {
        setCurrentVideoIndex(data.currentVideoIndex);
      }
    });
    const u5 = listenAudioFiles(setAudioFiles);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  // ── Find next visible video index ─────────────────────────────────────────
  const findNextIndex = useCallback((fromIdx, list) => {
    if (!list || list.length === 0) return 0;
    let next = (fromIdx + 1) % list.length;
    let tries = 0;
    while (list[next]?.isHidden && tries < list.length) {
      next = (next + 1) % list.length;
      tries++;
    }
    return tries < list.length ? next : fromIdx;
  }, []);

  // ── Advance to next video ─────────────────────────────────────────────────
  const nextVideo = useCallback(async () => {
    const list = playlistRef.current;
    if (!list || list.length === 0) return;
    const now = Date.now();
    if (now - lastSyncRef.current < 1500) return;
    lastSyncRef.current = now;
    const nextIdx = findNextIndex(currentIdxRef.current, list);
    await setCurrentVideoState(nextIdx);
  }, [findNextIndex]);

  // ── Listen to YouTube postMessage for ENDED event ─────────────────────────
  useEffect(() => {
    if (!isStarted) return;
    const handleMessage = (e) => {
      if (!e.origin.includes('youtube.com')) return;
      try {
        const data = JSON.parse(e.data);
        // playerState: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=video cued
        if (data?.event === 'onStateChange' && data?.info === 0) {
          nextVideo();
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isStarted, nextVideo]);

  // ── Auto-play iframe when it loads ────────────────────────────────────────
  const handleIframeLoad = useCallback(() => {
    // Send play and mute command via postMessage after load
    setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'mute', args: [] }),
          '*'
        );
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [0] }),
          '*'
        );
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } catch {}
    }, 500);
  }, []);

  // ── Audio playback ────────────────────────────────────────────────────────
  const audioQueueRef = useRef([]);
  const isAudioPlayingRef = useRef(false);

  const processAudioQueue = useCallback(async () => {
    if (isAudioPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isAudioPlayingRef.current = true;
    
    while (audioQueueRef.current.length > 0) {
      const urls = audioQueueRef.current.shift();
      
      for (const url of urls) {
        if (!url) continue;
        await new Promise((resolve) => {
          const audio = new Audio(url);
          audio.addEventListener('ended', resolve, { once: true });
          audio.addEventListener('error', resolve, { once: true });
          audio.play().catch(resolve);
        });
      }
      
      // Delay between different numbers
      await new Promise(r => setTimeout(r, 600));
    }
    
    isAudioPlayingRef.current = false;
  }, []);

  const speak = useCallback((number, tableNumber) => {
    const af = audioFilesRef.current;
    const qDigits = number.replace(/[^0-9]/g, '').split('');
    const tDigits = String(tableNumber).split('');
    const urls = [
      af.phrase_invite, af.letter_q,
      ...qDigits.map(d => af[`digit_${d}`]),
      af.phrase_counter,
      ...tDigits.map(d => af[`digit_${d}`]),
      af.phrase_end,
    ].filter(Boolean);
    if (urls.length === 0) return;
    
    audioQueueRef.current.push(urls);
    processAudioQueue();
  }, [processAudioQueue]);

  const lastSpokenAtRef = useRef(new Map());
  useEffect(() => {
    const called = queues.filter(q => q.status === 'called');
    const nowSeconds = Math.floor(Date.now() / 1000);
    called.forEach(q => {
      const lastCall = q.lastCalledAt?.seconds || 0;
      const prev = lastSpokenAtRef.current.get(q.id) || 0;
      const isRecent = (nowSeconds - lastCall) < 30;
      if (lastCall > prev && isRecent) {
        speak(q.number, q.assignedTable);
        lastSpokenAtRef.current.set(q.id, lastCall);
      } else if (lastCall > 0 && !isRecent) {
        lastSpokenAtRef.current.set(q.id, lastCall);
      }
    });
    const ids = new Set(called.map(q => q.id));
    for (const id of lastSpokenAtRef.current.keys()) {
      if (!ids.has(id)) lastSpokenAtRef.current.delete(id);
    }
  }, [queues, speak]);

  const getTableQueue = (num) => queues.find(q => q.status === 'called' && q.assignedTable === num);
  const getTableHistory = (num) =>
    queues.filter(q => (q.status === 'completed' || q.status === 'skipped') && q.assignedTable === num)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0] || null;

  // ── Resolve current playable item (skip hidden) ───────────────────────────
  const visiblePlaylist = playlist.filter(v => !v.isHidden);
  const currentItem = (() => {
    if (playlist.length === 0) return null;
    const item = playlist[currentVideoIndex];
    if (!item || item.isHidden) {
      return visiblePlaylist[0] || null;
    }
    return item;
  })();

  const embedSrc = currentItem ? buildEmbedSrc(currentItem.url) : null;
  const vertical = currentItem?.isVertical || isVerticalVideo(currentItem?.url);

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900 font-['Sarabun']">
      <audio id="tts-audio" preload="auto" />

      {/* Start overlay */}
      <AnimatePresence>
        {!isStarted && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-10"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-lg w-full text-center"
            >
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/20">
                <PlayIcon className="w-10 h-10 text-white translate-x-1" />
              </div>
              <h2 className="text-3xl font-black mb-4">เริ่มต้นระบบคิว</h2>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                กรุณาคลิกเพื่อเปิดการใช้งานวิดีโอและระบบเสียงประกาศ<br />
                เพื่อให้การแสดงผลเป็นไปอย่างราบรื่น
              </p>
              <button
                onClick={() => setIsStarted(true)}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-black transition-all active:scale-95"
              >
                เข้าสู่หน้า Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-[15vh] border-b border-slate-200 bg-white flex items-center px-4 md:px-10 shadow-sm relative z-20">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full text-center md:text-left">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center border-4 border-blue-500/10 shadow-lg overflow-hidden shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-full"
              onError={(e) => e.target.src = "https://via.placeholder.com/100?text=LOGO"} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-4xl font-black text-slate-800 tracking-tight">วิทยาลัยเทคโนโลยีขอนแก่น (P.TECH)</h1>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <div className="flex items-center gap-2 md:gap-3 text-2xl md:text-5xl font-black text-slate-800 tracking-tighter">
              <ClockIcon className="w-6 h-6 md:w-10 md:h-10 text-blue-500" />
              {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-0 md:mt-1">
              {currentTime.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <div className="h-[85vh] flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-8 relative overflow-hidden">
        {/* Video Section */}
        <div className="w-full md:w-[55%] h-full flex items-center justify-center relative pointer-events-none">
          <div className={`bg-black rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl transition-all duration-700 ${
            vertical ? 'h-full aspect-[9/16]' : 'w-full aspect-video max-h-full'
          }`}>
            {isStarted && embedSrc ? (
              /* Single stable iframe - src changes on index change, no DOM removal */
              <iframe
                ref={iframeRef}
                key={currentVideoIndex}     /* force reload when index changes */
                src={embedSrc}
                title="Dashboard Video Player"
                className={`w-full h-full border-none transition-transform duration-700 ${vertical ? 'scale-[1.05] md:scale-[1.18]' : ''}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                onLoad={handleIframeLoad}
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-slate-600">
                <VideoCameraIcon className="w-12 h-12 md:w-20 md:h-20 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-[10px] md:text-sm mt-4 text-slate-400">
                  {!isStarted ? 'กดปุ่มเริ่มต้นระบบ' : 'ไม่มีวิดีโอในเพลย์ลิสต์'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Queue Cards */}
        <div className="w-full md:w-[45%] h-full flex flex-col overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 h-full p-2 overflow-y-auto custom-scrollbar">
            {tables.map((table) => (
              <CompactQueueCard
                key={table.tableNumber}
                tableNumber={table.tableNumber}
                currentQueue={getTableQueue(table.tableNumber)}
                previousQueue={getTableHistory(table.tableNumber)}
                tableType={table.type}
              />
            ))}
          </div>
        </div>
      </div>

      <footer className="py-2 px-10 flex justify-center items-center bg-white/50 border-t border-slate-100">
        <p className="text-[10px] md:text-lg font-black text-slate-400 uppercase tracking-[0.2em]">
          Powered by Information Technology faculty ©2026
        </p>
      </footer>
    </div>
  );
}
