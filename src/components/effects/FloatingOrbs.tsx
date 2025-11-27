import React, { useEffect, useState } from 'react';

export const FloatingOrbs: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render on mobile - too heavy
  if (isMobile) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Simple static gradient for mobile */}
        <div 
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(112, 0, 255, 0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>
    );
  }

  // Desktop: CSS animations instead of framer-motion for better performance
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute rounded-full pointer-events-none animate-float-slow"
        style={{
          width: 350,
          height: 350,
          left: '10%',
          top: '20%',
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div 
        className="absolute rounded-full pointer-events-none animate-float-medium"
        style={{
          width: 400,
          height: 400,
          left: '60%',
          top: '10%',
          background: 'radial-gradient(circle, rgba(112, 0, 255, 0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div 
        className="absolute rounded-full pointer-events-none animate-float-fast"
        style={{
          width: 250,
          height: 250,
          left: '75%',
          top: '60%',
          background: 'radial-gradient(circle, rgba(0, 255, 148, 0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  );
};
