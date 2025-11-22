import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';

interface AbstractMapProps {
  userType: 'rider' | 'driver' | 'landing';
}

const AbstractMap: React.FC<AbstractMapProps> = ({ userType }) => {
  const [drivers, setDrivers] = useState<{ id: number; x: number; y: number }[]>([]);

  // Generate random "drivers"
  useEffect(() => {
    const newDrivers = Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setDrivers(newDrivers);
    
    const interval = setInterval(() => {
        setDrivers(prev => prev.map(d => ({
            ...d,
            x: Math.min(Math.max(d.x + (Math.random() - 0.5) * 5, 5), 95),
            y: Math.min(Math.max(d.y + (Math.random() - 0.5) * 5, 5), 95),
        })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-50 -z-10">
      {/* Grid Pattern */}
      <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
          backgroundSize: '32px 32px',
          opacity: 0.4
      }}></div>

      {/* Decorative Blobs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>

      {/* Animated Drivers */}
      {drivers.map((driver) => (
        <motion.div
          key={driver.id}
          className="absolute text-amber-500"
          initial={{ x: `${driver.x}%`, y: `${driver.y}%` }}
          animate={{ x: `${driver.x}%`, y: `${driver.y}%` }}
          transition={{ duration: 2, ease: "linear" }}
        >
          <div className="relative">
             <div className="w-3 h-3 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50"></div>
             {userType === 'rider' && (
                 <div className="absolute -inset-1 bg-amber-500/30 rounded-full animate-ping"></div>
             )}
          </div>
        </motion.div>
      ))}

      {/* User Location Pulse */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-900 rounded-full z-10 ring-4 ring-white shadow-xl"></div>
            <div className="absolute inset-0 bg-slate-900/20 rounded-full animate-ping scale-150"></div>
            <div className="absolute -top-8 bg-white px-2 py-1 rounded shadow text-[10px] font-bold text-slate-600 whitespace-nowrap">
                You
            </div>
        </div>
      </div>
    </div>
  );
};

export default AbstractMap;