// src/firebase/queueService.js
// ─────────────────────────────────────────────────────────────────────────────
// All Firestore read/write operations for the queue management system.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
  getDoc,
  limit,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

// ── Collection references ────────────────────────────────────────────────────
export const queuesRef = collection(db, 'queues');
export const tablesRef = collection(db, 'tables');
export const logsRef   = collection(db, 'logs');
export const systemSettingsRef = doc(db, 'settings', 'system');


// ── Faculty mappings ─────────────────────────────────────────────────────────
export const FACULTY_LABELS = {
  CASH: 'เงินสด',
  TRANSFER: 'เงินโอน'
};

// ── Storage Operations ────────────────────────────────────────────────────────
export const uploadVideo = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `videos/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
};

// ── Generate next queue number ────────────────────────────────────────────────
export async function generateQueueNumber() {
  // We only care about the very last created ticket to get the sequence
  const q = query(queuesRef, orderBy('createdAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return 'Q001';

  const lastNumber = snapshot.docs[0].data().number || 'Q000';
  let letter = lastNumber[0];
  let num    = parseInt(lastNumber.slice(1), 10);

  // Force start at Q001 if we encounter old A-prefix data
  if (letter < 'Q') {
    letter = 'Q';
    num = 0;
  }

  if (num >= 999) {
    const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
    return `${nextLetter}001`;
  }
  return `${letter}${String(num + 1).padStart(3, '0')}`;
}

export async function requestQueue(paymentType) {
  const number = await generateQueueNumber();
  let assignedTable = 0; // 0 means unassigned (for on-call mode)

  const type = paymentType?.toString().toUpperCase().trim();

  // Fetch current system settings
  const settingsSnap = await getDoc(systemSettingsRef);
  const settings = settingsSnap.exists() ? settingsSnap.data() : { assignmentMode: 'immediate' };

  if (settings.assignmentMode === 'immediate') {
    // Original Logic: Fetch all tables to find the best match
    const tablesSnap = await getDocs(tablesRef);
    const tables = tablesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Filter tables by requested payment type
    const availableTables = tables.filter(t => t.type === type);
    
    if (availableTables.length > 0) {
      const today = new Date();
      today.setHours(0,0,0,0);

      const counts = await Promise.all(availableTables.map(async (t) => {
        const q = query(
          queuesRef, 
          where('assignedTable', '==', t.tableNumber)
        );
        const snap = await getDocs(q);
        
        const activeToday = snap.docs.filter(doc => {
          const data = doc.data();
          const isToday = !data.createdAt || data.createdAt.toDate() >= today;
          const isActive = data.status === 'waiting' || data.status === 'called';
          return isToday && isActive;
        });

        return { table: t.tableNumber, count: activeToday.length };
      }));
      
      const bestTable = counts.reduce((prev, curr) => prev.count <= curr.count ? prev : curr);
      assignedTable = bestTable.table;
    } else if (tables.length > 0) {
      assignedTable = tables[0].tableNumber;
    }
  }

  const docRef = await addDoc(queuesRef, {
    number,
    paymentType: type,
    status: 'waiting',
    assignedTable: parseInt(assignedTable),
    createdAt: serverTimestamp(),
  });
  
  return { id: docRef.id, number, assignedTable, paymentType: type };
}


// ── Reset all queues ─────────────────────────────────────────────────────────
export async function resetQueues() {
  const snapshot = await getDocs(queuesRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  
  // Also reset tables
  const tablesSnap = await getDocs(tablesRef);
  const tableUpdates = tablesSnap.docs.map(d => updateDoc(d.ref, {
    currentQueueId: null,
    status: 'idle'
  }));
  await Promise.all(tableUpdates);
}

/** Delete specific queue records by their IDs */
export async function deleteQueuesByIds(ids) {
  const batch = writeBatch(db);
  ids.forEach(id => {
    batch.delete(doc(queuesRef, id));
  });
  await batch.commit();

  // If any of these were the current queue for a table, we should reset that table
  // But for history deletion, we usually don't need to touch current tables 
  // unless we are deleting "Today".
}


// ── Real-time listeners (Client-side filtering for reliability) ──────────────

/** Listen to ALL queues (used by Dashboard) */
export function listenAllQueues(callback) {
  // Increase limit to 500 to ensure we catch all daily tickets even if recalled from morning
  const q = query(queuesRef, orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    // Only show today's queues to prevent ghost tickets from previous days
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const filtered = all.filter(item => {
      const isNew = item.number && item.number >= 'Q';
      if (!item.createdAt) return isNew; // New items might not have timestamp yet
      const itemDate = item.createdAt.toDate();
      return isNew && itemDate >= today;
    });
    
    // Sort back to asc for consistent display
    callback(filtered.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
  });
}

/** Listen to queues for a specific table (used by Staff page) */
export function listenQueuesForTable(tableNumber, paymentType, assignmentMode, callback) {
  let q;
  
  if (assignmentMode === 'on-call') {
    // In on-call mode, look for queues of the same type that are EITHER unassigned OR assigned to THIS table
    q = query(
      queuesRef,
      where('paymentType', '==', paymentType)
    );
  } else {
    // In immediate mode, only look for queues specifically assigned to this table
    q = query(
      queuesRef, 
      where('assignedTable', '==', parseInt(tableNumber))
    );
  }
  
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    const today = new Date();
    today.setHours(0,0,0,0);

    // Filter by date and status in JS
    const filtered = all.filter(item => {
      const isNew = item.number && item.number >= 'Q';
      const itemDate = item.createdAt?.toDate() || new Date();
      const isToday = itemDate >= today;
      
      if (assignmentMode === 'on-call') {
        // Show if waiting and unassigned OR if it's already assigned/called at this table
        const isWaitingUnassigned = item.status === 'waiting' && (item.assignedTable === 0 || !item.assignedTable);
        const isMyActiveQueue = item.assignedTable === parseInt(tableNumber);
        return isNew && isToday && (isWaitingUnassigned || isMyActiveQueue);
      }
      
      return isNew && isToday;
    });
    
    // Sort by createdAt ascending (oldest first for the queue)
    const sorted = filtered.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeA - timeB;
    });

    callback(sorted);
  });
}


/** Listen to ALL queues (used for history/reporting) */
export function listenFullHistory(callback) {
  const q = query(queuesRef);
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const sorted = all.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(sorted);
  });
}

/** Listen to all tables */
export function listenTables(callback) {
  const q = query(tablesRef, orderBy('tableNumber', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ── Table operations ──────────────────────────────────────────────────────────

export async function initializeTables() {
  const snap = await getDocs(tablesRef);
  if (!snap.empty) return;

  const batch = writeBatch(db);
  const initialTables = [
    { tableNumber: 1, type: 'CASH', note: 'โต๊ะเงินสด 1' },
    { tableNumber: 2, type: 'TRANSFER', note: 'โต๊ะเงินโอน 2' },
    { tableNumber: 3, type: 'TRANSFER', note: 'โต๊ะเงินโอน 3' },
    { tableNumber: 4, type: 'TRANSFER', note: 'โต๊ะเงินโอน 4' },
  ];

  initialTables.forEach((t) => {
    const ref = doc(tablesRef, `table${t.tableNumber}`);
    batch.set(ref, { 
      ...t,
      currentQueueId: null,
      status: 'idle'
    });
  });
  await batch.commit();
}

export async function addTable(tableData) {
  const { tableNumber, type, note } = tableData;
  const ref = doc(tablesRef, `table${tableNumber}`);
  await setDoc(ref, {
    tableNumber: parseInt(tableNumber),
    type,
    note,
    currentQueueId: null,
    status: 'idle'
  });
}

export async function deleteTable(tableNumber) {
  const ref = doc(tablesRef, `table${tableNumber}`);
  await deleteDoc(ref);
}

export async function updateTable(tableNumber, updates) {
  const ref = doc(tablesRef, `table${tableNumber}`);
  await updateDoc(ref, updates);
}

export async function getOrCreateTable(tableNumber) {
  const ref = doc(tablesRef, `table${tableNumber}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await updateDoc(ref, { tableNumber, currentQueueId: null });
  }
  return ref;
}

// ── Queue actions ─────────────────────────────────────────────────────────────

export async function callNextQueue(tableNumber, queues) {
  const waiting = queues.filter((q) => q.status === 'waiting');
  if (waiting.length === 0) return null;

  const next = waiting[0];
  const batch = writeBatch(db);

  const queueRef = doc(queuesRef, next.id);
  batch.update(queueRef, {
    status: 'called',
    assignedTable: tableNumber,
    lastCalledAt: serverTimestamp(),
  });

  const tableRef = doc(tablesRef, `table${tableNumber}`);
  batch.update(tableRef, { currentQueueId: next.id });

  await batch.commit();
  await writeLog('call_next', next.id, tableNumber);
  return next;
}

export async function skipQueue(queueId, tableNumber) {
  const batch = writeBatch(db);
  batch.update(doc(queuesRef, queueId), { status: 'skipped' });
  batch.update(doc(tablesRef, `table${tableNumber}`), { currentQueueId: null });
  await batch.commit();
  await writeLog('skip', queueId, tableNumber);
}

export async function recallSkipped(queueId, tableNumber) {
  const batch = writeBatch(db);
  batch.update(doc(queuesRef, queueId), {
    status: 'called',
    assignedTable: tableNumber,
    lastCalledAt: serverTimestamp(),
  });
  batch.update(doc(tablesRef, `table${tableNumber}`), { currentQueueId: queueId });
  await batch.commit();
  await writeLog('recall_skipped', queueId, tableNumber);
}

export async function recallQueue(queueId, tableNumber) {
  await updateDoc(doc(queuesRef, queueId), {
    lastCalledAt: serverTimestamp()
  });
  await writeLog('recall', queueId, tableNumber);
}

export async function completeQueue(queueId, tableNumber) {
  const batch = writeBatch(db);
  
  // Fetch table note to store in history
  const tableRef = doc(tablesRef, `table${tableNumber}`);
  const tableSnap = await getDoc(tableRef);
  const tableNote = tableSnap.exists() ? tableSnap.data().note : '';

  batch.update(doc(queuesRef, queueId), { 
    status: 'completed',
    completedAt: serverTimestamp(),
    tableNote: tableNote
  });
  batch.update(tableRef, { currentQueueId: null });
  await batch.commit();
  await writeLog('complete', queueId, tableNumber);
}

// ── Playlist operations ───────────────────────────────────────────────────────
export const playlistRef = collection(db, 'playlist');

export function listenPlaylist(callback) {
  const q = query(playlistRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addVideoToPlaylist(url, duration, order, note = '') {
  await addDoc(playlistRef, {
    url,
    duration,
    order,
    note,
    isHidden: false,
    createdAt: serverTimestamp(),
  });
}

export async function removeVideoFromPlaylist(id) {
  await deleteDoc(doc(playlistRef, id));
}

export async function updateVideoOrder(id, newOrder) {
  await updateDoc(doc(playlistRef, id), { order: newOrder });
}

export async function reorderPlaylistItems(items) {
  const batch = writeBatch(db);
  items.forEach((item, index) => {
    const ref = doc(playlistRef, item.id);
    batch.update(ref, { order: index });
  });
  await batch.commit();
}

export async function toggleVideoVisibility(id, isHidden) {
  await updateDoc(doc(playlistRef, id), { isHidden: !isHidden });
}

export async function updateVideoAspect(id, isVertical) {
  await updateDoc(doc(playlistRef, id), { isVertical });
}

export async function updateVideoNote(id, note) {
  await updateDoc(doc(playlistRef, id), { note });
}

export async function setCurrentVideoState(index) {
  const ref = doc(db, 'settings', 'dashboard');
  await setDoc(ref, { currentVideoIndex: index }, { merge: true });
}

export function listenDashboardSettings(callback) {
  const ref = doc(db, 'settings', 'dashboard');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

// ── Audio file management (Base64 in Firestore to bypass Storage CORS/Billing) ──

/** Convert an audio file to a Base64 Data URL and save to Firestore */
export function uploadAudioFile(file, slot, onProgress) {
  return new Promise((resolve, reject) => {
    // Simulate initial progress
    if (onProgress) onProgress(10);
    
    const reader = new FileReader();
    reader.onload = async () => {
      if (onProgress) onProgress(50);
      try {
        const base64Url = reader.result;
        // Save directly to Firestore (files are small enough < 1MB)
        await saveAudioFileUrl(slot, base64Url);
        if (onProgress) onProgress(100);
        resolve(base64Url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Save an audio file Data URL to Firestore */
export async function saveAudioFileUrl(slot, url) {
  const ref = doc(db, 'settings', 'audioFiles');
  await setDoc(ref, { [slot]: url }, { merge: true });
}

/** Listen to audio file URLs in real-time */
export function listenAudioFiles(callback) {
  const ref = doc(db, 'settings', 'audioFiles');
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : {});
  });
}

/** Listen to System Settings (Assignment Mode, etc.) */
export function listenSystemSettings(callback) {
  return onSnapshot(systemSettingsRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({ assignmentMode: 'immediate' });
    }
  });
}

/** Update System Settings */
export async function updateSystemSettings(updates) {
  await setDoc(systemSettingsRef, updates, { merge: true });
}

async function writeLog(action, queueId, tableNumber) {
  await addDoc(logsRef, {
    action,
    queueId,
    tableNumber,
    timestamp: serverTimestamp(),
  });
}

