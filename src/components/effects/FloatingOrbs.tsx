import React from 'react';
import { motion } from 'framer-motion';

interface OrbProps {
  color: 'cyan' | 'purple' | 'green';
  size: number;
  x: string;
  y: string;
  delay: number;
  duration: number;
}

const Orb: React.FC<OrbProps> = ({ color, size, x, y, delay, duration }) => {
  const colors = {
    cyan: 'rgba(0, 240, 255, 0.15)',
    purple: 'rgba(112, 0, 255, 0.15)',
    green: 'rgba(0, 255, 148, 0.1)',
  };

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, ${colors[color]} 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -40, 20, 0],
        scale: [1, 1.2, 0.9, 1],
        opacity: [0.5, 0.8, 0.4, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export const FloatingOrbs: React.FC = () => {
  const orbs: OrbProps[] = [
    { color: 'cyan', size: 400, x: '10%', y: '20%', delay: 0, duration: 15 },
    { color: 'purple', size: 500, x: '60%', y: '10%', delay: 2, duration: 18 },
    { color: 'green', size: 300, x: '80%', y: '60%', delay: 4, duration: 12 },
    { color: 'cyan', size: 350, x: '20%', y: '70%', delay: 1, duration: 20 },
    { color: 'purple', size: 250, x: '40%', y: '50%', delay: 3, duration: 14 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <Orb key={i} {...orb} />
      ))}
    </div>
  );
};
