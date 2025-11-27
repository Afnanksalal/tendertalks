import React, { useEffect, useRef, useCallback, useState } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  trail: { x: number; y: number; opacity: number }[];
  active: boolean;
}

export const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const initStars = useCallback((width: number, height: number, mobile: boolean) => {
    // Fewer stars on mobile for performance
    const starCount = mobile 
      ? Math.floor((width * height) / 25000) 
      : Math.floor((width * height) / 10000);
    
    starsRef.current = Array.from({ length: Math.min(starCount, mobile ? 50 : 150) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    }));
    
    // Initialize shooting stars array
    shootingStarsRef.current = [];
  }, []);

  const createShootingStar = useCallback((width: number, height: number): ShootingStar => {
    // Start from random position at top or left edge
    const startFromTop = Math.random() > 0.3;
    const x = startFromTop ? Math.random() * width : 0;
    const y = startFromTop ? 0 : Math.random() * height * 0.5;
    
    // Angle between 20-50 degrees (going down-right)
    const angle = (Math.random() * 30 + 20) * (Math.PI / 180);
    
    // Random shorter trail lengths (20-60px range for variety)
    const length = Math.random() * 40 + 20;
    
    return {
      x,
      y,
      length,
      speed: Math.random() * 6 + 10, // Slightly slower for smoother look
      angle,
      opacity: 1,
      trail: [],
      active: true,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      initStars(width, height, isMobile);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let lastTime = 0;
    let lastShootingStarTime = 0;
    const targetFPS = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFPS;
    const shootingStarInterval = isMobile ? 4000 : 2500; // Spawn interval

    const animate = (currentTime: number) => {
      animationRef.current = requestAnimationFrame(animate);
      
      const delta = currentTime - lastTime;
      if (delta < frameInterval) return;
      lastTime = currentTime - (delta % frameInterval);

      ctx.clearRect(0, 0, width, height);
      time += 0.016;

      // Draw static stars
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinklePhase);
        const currentOpacity = star.opacity * (0.6 + twinkle * 0.4);

        if (isMobile) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
          ctx.fill();
        } else {
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 2
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`);
          gradient.addColorStop(0.5, `rgba(200, 240, 255, ${currentOpacity * 0.3})`);
          gradient.addColorStop(1, 'rgba(200, 240, 255, 0)');

          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });

      // Spawn new shooting stars periodically
      if (currentTime - lastShootingStarTime > shootingStarInterval) {
        if (shootingStarsRef.current.length < (isMobile ? 1 : 2)) {
          shootingStarsRef.current.push(createShootingStar(width, height));
        }
        lastShootingStarTime = currentTime;
      }

      // Update and draw shooting stars with bloomy faded trails
      shootingStarsRef.current = shootingStarsRef.current.filter(star => {
        if (!star.active) return false;

        // Add current position to trail
        star.trail.unshift({ x: star.x, y: star.y, opacity: star.opacity });
        
        // Shorter trail based on random length
        const maxTrailLength = Math.floor(star.length / 4) + 5;
        if (star.trail.length > maxTrailLength) {
          star.trail.pop();
        }

        // Move the star
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;

        // Draw bloomy faded trail - multiple layers for glow effect
        if (star.trail.length > 1) {
          const tailPoint = star.trail[star.trail.length - 1];
          
          // Layer 1: Outermost bloom (very soft, wide)
          const bloomGradient = ctx.createLinearGradient(
            tailPoint.x, tailPoint.y,
            star.x, star.y
          );
          bloomGradient.addColorStop(0, 'rgba(0, 240, 255, 0)');
          bloomGradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.05)');
          bloomGradient.addColorStop(1, 'rgba(0, 240, 255, 0.15)');

          ctx.beginPath();
          ctx.moveTo(tailPoint.x, tailPoint.y);
          for (let i = star.trail.length - 2; i >= 0; i--) {
            ctx.lineTo(star.trail[i].x, star.trail[i].y);
          }
          ctx.lineTo(star.x, star.y);
          ctx.strokeStyle = bloomGradient;
          ctx.lineWidth = 12;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Layer 2: Mid bloom
          const midBloom = ctx.createLinearGradient(
            tailPoint.x, tailPoint.y,
            star.x, star.y
          );
          midBloom.addColorStop(0, 'rgba(0, 240, 255, 0)');
          midBloom.addColorStop(0.4, 'rgba(0, 240, 255, 0.1)');
          midBloom.addColorStop(0.8, 'rgba(100, 250, 255, 0.3)');
          midBloom.addColorStop(1, 'rgba(200, 255, 255, 0.5)');

          ctx.beginPath();
          ctx.moveTo(tailPoint.x, tailPoint.y);
          for (let i = star.trail.length - 2; i >= 0; i--) {
            ctx.lineTo(star.trail[i].x, star.trail[i].y);
          }
          ctx.lineTo(star.x, star.y);
          ctx.strokeStyle = midBloom;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Layer 3: Core trail (bright, thin)
          const coreTrail = ctx.createLinearGradient(
            tailPoint.x, tailPoint.y,
            star.x, star.y
          );
          coreTrail.addColorStop(0, 'rgba(255, 255, 255, 0)');
          coreTrail.addColorStop(0.3, 'rgba(200, 255, 255, 0.2)');
          coreTrail.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
          coreTrail.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

          ctx.beginPath();
          ctx.moveTo(tailPoint.x, tailPoint.y);
          for (let i = star.trail.length - 2; i >= 0; i--) {
            ctx.lineTo(star.trail[i].x, star.trail[i].y);
          }
          ctx.lineTo(star.x, star.y);
          ctx.strokeStyle = coreTrail;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw the head with soft bloom glow
        // Outer bloom (large, soft)
        const outerBloom = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, 15
        );
        outerBloom.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
        outerBloom.addColorStop(0.3, 'rgba(0, 240, 255, 0.15)');
        outerBloom.addColorStop(0.6, 'rgba(0, 240, 255, 0.05)');
        outerBloom.addColorStop(1, 'rgba(0, 240, 255, 0)');

        ctx.beginPath();
        ctx.arc(star.x, star.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = outerBloom;
        ctx.fill();

        // Inner glow
        const innerGlow = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, 6
        );
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        innerGlow.addColorStop(0.3, 'rgba(200, 255, 255, 0.7)');
        innerGlow.addColorStop(0.6, 'rgba(0, 240, 255, 0.4)');
        innerGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');

        ctx.beginPath();
        ctx.arc(star.x, star.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = innerGlow;
        ctx.fill();

        // Bright white core
        ctx.beginPath();
        ctx.arc(star.x, star.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        // Check if out of bounds
        if (star.x > width + 100 || star.y > height + 100 || star.x < -100 || star.y < -100) {
          star.active = false;
          return false;
        }

        return true;
      });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initStars, isMobile, createShootingStar]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: isMobile ? 0.6 : 0.8 }}
    />
  );
};
