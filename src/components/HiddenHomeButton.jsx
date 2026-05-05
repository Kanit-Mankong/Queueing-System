// src/components/HiddenHomeButton.jsx
import { useState } from 'react';
import { HomeIcon } from '@heroicons/react/24/solid';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function HiddenHomeButton() {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on landing page
  if (location.pathname === '/') return null;

  return (
    <div 
      className="fixed top-0 right-0 w-32 h-32 z-[9999] flex items-start justify-end p-4 pointer-events-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="pointer-events-auto">
        <AnimatePresence>
          {isHovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, x: 10, y: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10, y: -10 }}
              onClick={() => navigate('/')}
              className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all shadow-2xl"
              title="กลับหน้าหลัก"
            >
              <HomeIcon className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
