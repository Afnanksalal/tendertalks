import React, { useEffect, useRef, useCallback } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
  active: boolean;
  trail: { x: number; y: number; opacity: number }[];
}

export const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const lastShootingStarTime = useRef(0);

  const initStars = useCallback((width: number, height: number) => {
    const starCount = Math.floor((width * height) / 8000);
    starsRef.current = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.02 + 0.01,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    // Initialize shooting stars pool (only 2 max at a time)
    shootingStarsRef.current = Array.from({ length: 2 }, () => ({
      x: 0,
      y: 0,
      length: 0,
      speed: 0,
      opacity: 0,
      angle: 0,
      active: false,
      trail: [],
    }));
  }, []);

  const spawnShootingStar = useCallback((width: number, height: number) => {
    const inactiveStar = shootingStarsRef.current.find(s => !s.active);
    if (!inactiveStar) return;

    // Random spawn position across the screen (top half, any horizontal position)
    inactiveStar.x = Math.random() * width * 0.8 + width * 0.1; // 10%-90% of width
    inactiveStar.y = Math.random() * height * 0.4; // Top 40% of screen
    inactiveStar.length = Math.random() * 25 + 15; // Shorter trail
    inactiveStar.speed = Math.random() * 3 + 5; // Slower, more graceful
    inactiveStar.opacity = 1;
    // Random angle between 30-60 degrees (downward diagonal)
    inactiveStar.angle = (Math.PI / 6) + Math.random() * (Math.PI / 6);
    inactiveStar.active = true;
    inactiveStar.trail = [];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      initStars(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      time += 0.016;

      // Draw and update stars
      starsRef.current.forEach(star => {
        // Twinkle effect
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinklePhase);
        const currentOpacity = star.opacity * (0.5 + twinkle * 0.5);

        // Draw star with glow
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 3
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`);
        gradient.addColorStop(0.3, `rgba(200, 240, 255, ${currentOpacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(200, 240, 255, 0)');

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core of star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.fill();
      });

      // Spawn shooting stars at random intervals (6-18 seconds)
      const now = Date.now();
      if (now - lastShootingStarTime.current > 6000 + Math.random() * 12000) {
        spawnShootingStar(rect.width, rect.height);
        lastShootingStarTime.current = now;
      }

      // Draw and update shooting stars
      shootingStarsRef.current.forEach(star => {
        if (!star.active) return;

        // Add current position to trail (shorter trail)
        star.trail.unshift({ x: star.x, y: star.y, opacity: star.opacity });
        if (star.trail.length > 18) star.trail.pop();

        // Update position
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;

        // Fade out faster for shorter duration
        star.opacity -= 0.012;

        // Draw smooth trail with gradient
        if (star.trail.length > 2) {
          const trailLength = star.trail.length;
          
          // Draw each segment with fading opacity for smooth gradient effect
          for (let i = 0; i < trailLength - 1; i++) {
            const point = star.trail[i];
            const nextPoint = star.trail[i + 1];
            const progress = i / trailLength; // 0 at head, 1 at tail
            const segmentOpacity = star.opacity * (1 - progress * progress); // Quadratic falloff
            
            if (segmentOpacity <= 0.01) continue;

            // Outer soft bloom
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(nextPoint.x, nextPoint.y);
            ctx.strokeStyle = `rgba(0, 180, 255, ${segmentOpacity * 0.12})`;
            ctx.lineWidth = 16 * (1 - progress * 0.7);
            ctx.lineCap = 'round';
            ctx.stroke();

            // Middle glow
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(nextPoint.x, nextPoint.y);
            ctx.strokeStyle = `rgba(80, 200, 255, ${segmentOpacity * 0.25})`;
            ctx.lineWidth = 8 * (1 - progress * 0.6);
            ctx.stroke();

            // Inner bright core
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(nextPoint.x, nextPoint.y);
            ctx.strokeStyle = `rgba(200, 240, 255, ${segmentOpacity * 0.5})`;
            ctx.lineWidth = 3 * (1 - progress * 0.5);
            ctx.stroke();

            // White hot center (only near head)
            if (progress < 0.3) {
              ctx.beginPath();
              ctx.moveTo(point.x, point.y);
              ctx.lineTo(nextPoint.x, nextPoint.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${segmentOpacity * 0.8 * (1 - progress / 0.3)})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }

          // Head glow - soft bloom effect
          const headGradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, 25
          );
          headGradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * 0.95})`);
          headGradient.addColorStop(0.15, `rgba(200, 250, 255, ${star.opacity * 0.7})`);
          headGradient.addColorStop(0.35, `rgba(100, 220, 255, ${star.opacity * 0.4})`);
          headGradient.addColorStop(0.6, `rgba(0, 180, 255, ${star.opacity * 0.15})`);
          headGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
          
          ctx.beginPath();
          ctx.arc(star.x, star.y, 25, 0, Math.PI * 2);
          ctx.fillStyle = headGradient;
          ctx.fill();
        }

        // Deactivate if off screen or faded
        if (star.x > rect.width + 100 || star.y > rect.height + 100 || star.opacity <= 0) {
          star.active = false;
          star.trail = [];
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initStars, spawnShootingStar]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
};
