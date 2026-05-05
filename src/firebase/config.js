// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getFirestore }  from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDKyTdVzi29zth_BTBgzQjOd9aEntthx-E",
  authDomain: "queueing-system-98dad.firebaseapp.com",
  projectId: "queueing-system-98dad",
  storageBucket: "queueing-system-98dad.firebasestorage.app",
  messagingSenderId: "624131607610",
  appId: "1:624131607610:web:93c9240eb7d9d058cff903",
  measurementId: "G-BG5M04F1WL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
