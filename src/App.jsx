import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Toaster } from 'react-hot-toast';
import Landing   from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Staff     from './pages/Staff';
import Kiosk     from './pages/Kiosk';
import PlaylistManager from './pages/PlaylistManager';
import HiddenHomeButton from './components/HiddenHomeButton';
import History from './pages/History';
import Settings from './pages/Settings';
import { initializeTables } from './firebase/queueService';

export default function App() {
  useEffect(() => {
    initializeTables();
  }, []);

  return (
    <BrowserRouter>
      <HiddenHomeButton />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: '1.5rem',
            padding: '1rem 1.5rem',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            fontWeight: 'bold',
            fontFamily: 'Sarabun',
          },
        }} 
      />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{    opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/"                 element={<Landing />} />
          <Route path="/dashboard"        element={<Dashboard />} />
          <Route path="/staff"            element={<Staff />} />
          <Route path="/kiosk"            element={<Kiosk />} />
          <Route path="/playlist-manager" element={<PlaylistManager />} />
          <Route path="/history"          element={<History />} />
          <Route path="/settings"         element={<Settings />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
